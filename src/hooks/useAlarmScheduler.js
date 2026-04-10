import { useState, useEffect, useRef, useCallback } from "react";
import { sendNotification, requestNotificationPermission } from "../utils/notifications";
import { getDateStr } from "../utils/dateUtils";
import { CATEGORIES } from "../constants/categories";
import { scheduleAlarm as swScheduleAlarm, onSWMessage } from "../utils/swRegistration";
import { takeoverScreen } from "../utils/screenTakeover";

const SNOOZE_STORAGE_KEY = "memchwo-snooze-map";
const CHECK_INTERVAL_MS = 30000; // 30초마다 체크
const TRIGGER_WINDOW_MIN = 2; // 출발시각 2분 전부터 트리거

/**
 * localStorage 기반 스누즈 맵 관리
 */
function loadSnoozeMap() {
  try {
    const stored = localStorage.getItem(SNOOZE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveSnoozeMap(map) {
  try {
    localStorage.setItem(SNOOZE_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // storage full — ignore
  }
}

/**
 * 현재 시각을 분 단위로 반환 (0 ~ 1439)
 */
function getCurrentMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * "HH:MM" 문자열을 분 단위로 변환
 */
function timeStrToMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

/**
 * task 목록을 감시하여 출발 시각에 자동으로 알림을 트리거하는 훅.
 *
 * @param {Array} tasks - 전체 task 배열
 * @returns {{ activeAlarm, dismissAlarm, snoozeAlarm, triggerAlarm }}
 */
export default function useAlarmScheduler(tasks) {
  const [activeAlarm, setActiveAlarm] = useState(null);
  const triggeredRef = useRef(new Set()); // 이미 트리거된 task ID
  const snoozeMapRef = useRef(loadSnoozeMap());

  // 앱 시작 시 알림 권한 요청 + SW 메시지 리스너
  useEffect(() => {
    requestNotificationPermission();

    // SW에서 알림 클릭 시 해당 task 알람 표시 + 화면 전환
    const unsubscribe = onSWMessage((data) => {
      if (data?.type === "ALARM_CLICKED" && data.taskId) {
        const task = tasks.find((t) => String(t.id) === String(data.taskId));
        if (task) {
          takeoverScreen();
          setActiveAlarm(task);
        }
      }
    });
    return unsubscribe;
  }, [tasks]);

  // 완료/삭제된 task의 스누즈 엔트리 정리
  useEffect(() => {
    const taskIds = new Set(tasks.map((t) => String(t.id)));
    const map = snoozeMapRef.current;
    let changed = false;

    for (const id of Object.keys(map)) {
      if (!taskIds.has(id) || tasks.find((t) => String(t.id) === id)?.completed) {
        delete map[id];
        changed = true;
      }
    }

    if (changed) saveSnoozeMap(map);
  }, [tasks]);

  // 30초 간격 스캔
  useEffect(() => {
    const check = () => {
      if (activeAlarm) return; // 이미 알림 표시 중

      const now = getCurrentMinutes();
      const today = getDateStr(0);
      const snoozeMap = snoozeMapRef.current;

      for (const task of tasks) {
        // 완료됨, 오늘이 아님, 시간 미지정 → 스킵
        if (task.completed || task.date !== today || !task.time) continue;

        const taskId = String(task.id);

        // 스누즈 중이면 만료 여부 확인
        if (snoozeMap[taskId]) {
          if (Date.now() < snoozeMap[taskId]) continue; // 아직 스누즈 중
          delete snoozeMap[taskId]; // 스누즈 만료
          saveSnoozeMap(snoozeMap);
          triggeredRef.current.delete(taskId); // 재트리거 허용
        }

        // 이미 트리거됨
        if (triggeredRef.current.has(taskId)) continue;

        // 출발 시각 계산
        const arrivalMinutes = timeStrToMinutes(task.time);
        const departureMinutes = arrivalMinutes - (task.travelTime || 0) - (task.prepTime || 0);
        const diff = departureMinutes - now;

        // 출발 시각 2분 이내이면 트리거
        if (diff <= TRIGGER_WINDOW_MIN && diff >= -10) {
          triggeredRef.current.add(taskId);

          const categoryInfo = CATEGORIES[task.category] || {};
          const title = `${categoryInfo.icon || "📌"} ${task.title}`;
          const body = `${task.time}까지 도착 · 지금 출발하세요!`;

          // 시스템 알림 (탭 비활성이든 아니든 항상 발송)
          swScheduleAlarm({
            id: task.id,
            title,
            body,
            triggerAt: Date.now(),
          });
          sendNotification(title, body, () => {
            takeoverScreen();
            setActiveAlarm(task);
          });

          // 화면 강제 전환: 포커스 + 풀스크린 + Wake Lock
          takeoverScreen();

          setActiveAlarm(task);
          break; // 한 번에 하나만
        }
      }
    };

    check(); // 즉시 1회 실행
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [tasks, activeAlarm]);

  const dismissAlarm = useCallback(() => {
    setActiveAlarm(null);
  }, []);

  const snoozeAlarm = useCallback(() => {
    if (!activeAlarm) return;

    const taskId = String(activeAlarm.id);
    const snoozeUntil = Date.now() + 5 * 60 * 1000; // 5분 후

    snoozeMapRef.current[taskId] = snoozeUntil;
    saveSnoozeMap(snoozeMapRef.current);
    triggeredRef.current.delete(taskId); // 재트리거 허용

    setActiveAlarm(null);
  }, [activeAlarm]);

  const triggerAlarm = useCallback((task) => {
    setActiveAlarm(task);
  }, []);

  return { activeAlarm, dismissAlarm, snoozeAlarm, triggerAlarm };
}
