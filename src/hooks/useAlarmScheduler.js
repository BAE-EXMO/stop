import { useState, useEffect, useRef, useCallback } from "react";
import { sendNotification, requestNotificationPermission } from "../utils/notifications";
import { getDateStr } from "../utils/dateUtils";
import { CATEGORIES } from "../constants/categories";
import { scheduleAlarm as swScheduleAlarm, onSWMessage } from "../utils/swRegistration";
import { takeoverScreen } from "../utils/screenTakeover";

const SNOOZE_STORAGE_KEY = "memchwo-snooze-map";
const SNOOZE_COUNT_KEY = "memchwo-snooze-count";
const CHECK_INTERVAL_MS = 30000;

// ─── 스누즈 맵 관리 ───

function loadSnoozeMap() {
  try {
    const stored = localStorage.getItem(SNOOZE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch { return {}; }
}

function saveSnoozeMap(map) {
  try { localStorage.setItem(SNOOZE_STORAGE_KEY, JSON.stringify(map)); }
  catch { /* ignore */ }
}

function loadSnoozeCount() {
  try {
    const stored = localStorage.getItem(SNOOZE_COUNT_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch { return {}; }
}

function saveSnoozeCount(map) {
  try { localStorage.setItem(SNOOZE_COUNT_KEY, JSON.stringify(map)); }
  catch { /* ignore */ }
}

// ─── 시간 유틸 ───

function getCurrentMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function timeStrToMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

/**
 * 3단계 알림 타이밍 + 스누즈 에스컬레이션을 지원하는 알람 스케줄러.
 *
 * 알림 시퀀스:
 *   [출발 15분 전] 1차: 사전 안내 (배너만, 감각 전환 없음)
 *   [출발 5분 전]  2차: 감각 전환 알림 (전체 시퀀스)
 *   [출발 시각]    3차: 긴급 알림 (감각 전환 스킵, 바로 정보 카드)
 *
 * @param {Array} tasks
 * @returns {{ activeAlarm, alarmMode, snoozeCount, dismissAlarm, snoozeAlarm, postponeAlarm, triggerAlarm }}
 */
export default function useAlarmScheduler(tasks) {
  const [activeAlarm, setActiveAlarm] = useState(null);
  const [alarmMode, setAlarmMode] = useState("full"); // "full" | "urgent"
  const snoozeCountRef = useRef(loadSnoozeCount());

  // triggeredRef: { taskId: { pre15: bool, main5: bool, urgent0: bool } }
  const triggeredRef = useRef({});
  const snoozeMapRef = useRef(loadSnoozeMap());

  // 알림 권한 + SW 메시지
  useEffect(() => {
    requestNotificationPermission();

    const unsubscribe = onSWMessage((data) => {
      if (data?.type === "ALARM_CLICKED" && data.taskId) {
        const task = tasks.find((t) => String(t.id) === String(data.taskId));
        if (task) {
          takeoverScreen();
          setAlarmMode("full");
          setActiveAlarm(task);
        }
      }
    });
    return unsubscribe;
  }, [tasks]);

  // 완료/삭제된 task 정리
  useEffect(() => {
    const taskIds = new Set(tasks.map((t) => String(t.id)));
    const snoozeMap = snoozeMapRef.current;
    const snoozeCounts = snoozeCountRef.current;
    let changed = false;

    for (const id of Object.keys(snoozeMap)) {
      if (!taskIds.has(id) || tasks.find((t) => String(t.id) === id)?.completed) {
        delete snoozeMap[id];
        delete snoozeCounts[id];
        changed = true;
      }
    }

    if (changed) {
      saveSnoozeMap(snoozeMap);
      saveSnoozeCount(snoozeCounts);
    }
  }, [tasks]);

  // 30초 간격 스캔
  useEffect(() => {
    const check = () => {
      if (activeAlarm) return;

      const now = getCurrentMinutes();
      const today = getDateStr(0);
      const snoozeMap = snoozeMapRef.current;

      for (const task of tasks) {
        if (task.completed || task.date !== today || !task.time) continue;

        const taskId = String(task.id);

        // 스누즈 체크
        if (snoozeMap[taskId]) {
          if (Date.now() < snoozeMap[taskId]) continue;
          delete snoozeMap[taskId];
          saveSnoozeMap(snoozeMap);
          // 스누즈 만료 시 해당 단계 재트리거 허용
          const triggered = triggeredRef.current[taskId] || {};
          triggered.main5 = false;
          triggeredRef.current[taskId] = triggered;
        }

        const triggered = triggeredRef.current[taskId] || { pre15: false, main5: false, urgent0: false };
        const arrivalMinutes = timeStrToMinutes(task.time);
        const departureMinutes = arrivalMinutes - (task.travelTime || 0) - (task.prepTime || 0);
        const diff = departureMinutes - now; // 출발까지 남은 분

        const categoryInfo = CATEGORIES[task.category] || {};
        const title = `${categoryInfo.icon || "📌"} ${task.title}`;

        // ─── 1차: 15분 전 사전 안내 (배너만) ───
        if (!triggered.pre15 && diff <= 15 && diff > 5) {
          triggered.pre15 = true;
          triggeredRef.current[taskId] = triggered;

          const body = `${diff}분 후 ${task.title}을 위해 출발해야 합니다`;
          swScheduleAlarm({ id: task.id, title, body, triggerAt: Date.now() });
          sendNotification(title, body, () => {
            takeoverScreen();
            setAlarmMode("full");
            setActiveAlarm(task);
          });
          // 배너만 — 전체 화면 전환 없음
        }

        // ─── 2차: 5분 전 감각 전환 알림 ───
        if (!triggered.main5 && diff <= 5 && diff > -2) {
          triggered.main5 = true;
          triggeredRef.current[taskId] = triggered;

          const body = `${task.time}까지 도착 · 지금 출발하세요!`;
          swScheduleAlarm({ id: task.id, title, body, triggerAt: Date.now() });
          sendNotification(title, body, () => {
            takeoverScreen();
            setAlarmMode("full");
            setActiveAlarm(task);
          });

          takeoverScreen();
          setAlarmMode("full");
          setActiveAlarm(task);
          break;
        }

        // ─── 3차: 출발 시각 긴급 알림 ───
        if (!triggered.urgent0 && diff <= -2 && diff >= -15) {
          triggered.urgent0 = true;
          triggeredRef.current[taskId] = triggered;

          const body = "지금 출발하지 않으면 늦습니다!";
          swScheduleAlarm({ id: task.id, title: `🚨 ${title}`, body, triggerAt: Date.now() });
          sendNotification(`🚨 ${title}`, body, () => {
            takeoverScreen();
            setAlarmMode("urgent");
            setActiveAlarm(task);
          });

          takeoverScreen();
          setAlarmMode("urgent"); // 감각 전환 스킵
          setActiveAlarm(task);
          break;
        }
      }
    };

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [tasks, activeAlarm]);

  const dismissAlarm = useCallback(() => {
    setActiveAlarm(null);
    setAlarmMode("full");
  }, []);

  /**
   * 스누즈 에스컬레이션:
   *   1회: 5분 후, 동일 감각 전환
   *   2회: 3분 후, Phase 2 스킵 (snoozeCount로 전달)
   *   3회: 불가 — onPostpone 사용
   */
  const snoozeAlarm = useCallback(() => {
    if (!activeAlarm) return;

    const taskId = String(activeAlarm.id);
    const counts = snoozeCountRef.current;
    const currentCount = counts[taskId] || 0;

    if (currentCount >= 2) return; // 3회째는 스누즈 불가

    const nextCount = currentCount + 1;
    const delay = nextCount === 1 ? 5 * 60 * 1000 : 3 * 60 * 1000; // 1회: 5분, 2회: 3분
    const snoozeUntil = Date.now() + delay;

    snoozeMapRef.current[taskId] = snoozeUntil;
    saveSnoozeMap(snoozeMapRef.current);

    counts[taskId] = nextCount;
    snoozeCountRef.current = counts;
    saveSnoozeCount(counts);

    // 재트리거 허용
    const triggered = triggeredRef.current[taskId] || {};
    triggered.main5 = false;
    triggeredRef.current[taskId] = triggered;

    setActiveAlarm(null);
    setAlarmMode("full");
  }, [activeAlarm]);

  const getSnoozeCount = useCallback((taskId) => {
    return snoozeCountRef.current[String(taskId)] || 0;
  }, []);

  const triggerAlarm = useCallback((task) => {
    setAlarmMode("full");
    setActiveAlarm(task);
  }, []);

  return {
    activeAlarm,
    alarmMode,
    getSnoozeCount,
    dismissAlarm,
    snoozeAlarm,
    triggerAlarm,
  };
}
