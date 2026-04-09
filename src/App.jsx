import { useState, useEffect } from "react";
import { CATEGORIES } from "./constants/categories";
import { FONT_FAMILY } from "./constants/fonts";
import { getDateStr } from "./utils/dateUtils";
import { calcPriority } from "./utils/priorityUtils";
import { createSampleTasks } from "./data/sampleTasks";
import { DEFAULT_VISIT_HISTORY } from "./data/visitHistory";
import { DEFAULT_MEDIA } from "./data/defaultPhotos";
import usePersistedState from "./hooks/usePersistedState";
import useAlarmScheduler from "./hooks/useAlarmScheduler";
import { recordVisit } from "./utils/visitHistoryManager";
import { recordTaskAction } from "./utils/behaviorTracker";

import SensoryAlarm from "./components/SensoryAlarm/SensoryAlarm";
import SettingsScreen from "./components/SettingsScreen/SettingsScreen";
import AddTaskModal from "./components/AddTaskModal/AddTaskModal";
import TaskCard from "./components/TaskCard/TaskCard";

import "./styles/global.css";

/**
 * 지금 해야 할 일 모달
 */
function NowTaskModal({ task, onConfirm }) {
  const categoryInfo = CATEGORIES[task.category];
  const hasNotes = task.prepItems && task.prepItems.length > 0;
  const hasDeadline = !!task.deadline;
  const hasPostpone = task.postponeCount > 0;

  const infoRows = [
    task.time && { icon: "⏰", label: "시간", value: `${task.time}까지` },
    task.location !== "미정" && { icon: "📍", label: "장소", value: task.location },
    task.duration && { icon: "⏱️", label: "소요시간", value: task.duration },
    task.contact && { icon: "📞", label: "연락처", value: task.contact },
    task.attendees && { icon: "👥", label: "참석자", value: task.attendees },
    task.manager && { icon: "👤", label: "담당자", value: task.manager },
  ].filter(Boolean);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 850, display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.25)",
    }}>
      <div style={{
        width: "100%", maxWidth: 380, margin: "0 16px", borderRadius: 24,
        background: "#fff", border: "1px solid #e0e0e0", padding: "28px 24px",
        fontFamily: FONT_FAMILY, maxHeight: "80vh", overflowY: "auto",
      }}>
        {/* 헤더 */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>{categoryInfo.icon}</div>
          <div style={{ fontSize: 12, color: "#E8590C", fontWeight: 800, letterSpacing: 1, marginBottom: 4 }}>지금 할 일</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#1a1a1a" }}>{task.title}</div>
        </div>

        {/* 상태 뱃지: 마감시한 · 미룬 횟수 */}
        {(hasDeadline || hasPostpone) && (
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16, flexWrap: "wrap" }}>
            {hasDeadline && (
              <span style={{
                fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 8,
                background: "#E8590C12", color: "#E8590C", border: "1px solid #E8590C33",
              }}>
                📅 마감 {task.deadline}
              </span>
            )}
            {hasPostpone && (
              <span style={{
                fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 8,
                background: task.postponeCount >= 3 ? "#E0313115" : "#E6770015",
                color: task.postponeCount >= 3 ? "#E03131" : "#E67700",
                border: `1px solid ${task.postponeCount >= 3 ? "#E0313133" : "#E6770033"}`,
              }}>
                {task.postponeCount >= 3 ? "😤" : "⏰"} {task.postponeCount}번 미룸
              </span>
            )}
          </div>
        )}

        {/* 정보 행 */}
        {infoRows.length > 0 && (
          <div style={{
            background: "#fafafa", borderRadius: 14, border: "1px solid #eee",
            padding: "4px 0", marginBottom: 12,
          }}>
            {infoRows.map((row, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
                borderTop: i > 0 ? "1px solid #f0f0f0" : "none",
              }}>
                <span style={{ fontSize: 16, width: 24, textAlign: "center", flexShrink: 0 }}>{row.icon}</span>
                <span style={{ fontSize: 12, color: "#999", width: 56, flexShrink: 0 }}>{row.label}</span>
                <span style={{ fontSize: 14, color: "#333", fontWeight: 600 }}>{row.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* 메모 · 준비물 */}
        {hasNotes && (
          <div style={{
            background: "#fafafa", borderRadius: 14, padding: "14px 16px", marginBottom: 16,
            border: "1px solid #eee",
          }}>
            <div style={{ fontSize: 12, color: "#999", fontWeight: 700, marginBottom: 8 }}>📋 내용 · 준비물</div>
            {task.prepItems.map((item, i) => (
              <div key={i} style={{ fontSize: 14, color: "#444", lineHeight: 1.7, paddingLeft: 4 }}>· {item.text}</div>
            ))}
          </div>
        )}

        {/* 확인함 버튼 */}
        <button
          onClick={onConfirm}
          style={{
            width: "100%", padding: 16, borderRadius: 14, border: "none",
            background: "#E8590C", color: "#fff", fontSize: 16, fontWeight: 800,
            fontFamily: FONT_FAMILY, cursor: "pointer",
          }}
        >
          확인함
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [tasks, setTasks] = usePersistedState("memchwo-tasks", createSampleTasks);
  const [visitHistory, setVisitHistory] = usePersistedState("memchwo-visit-history", DEFAULT_VISIT_HISTORY);
  const [media, setMedia] = usePersistedState("memchwo-media", DEFAULT_MEDIA);
  const { activeAlarm, dismissAlarm, snoozeAlarm, triggerAlarm } = useAlarmScheduler(tasks);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [nowTask, setNowTask] = useState(null);

  // Task CRUD
  const addTask = (task) => {
    setTasks((prev) => [...prev, task]);
    setShowAddModal(false);
  };

  const deleteTask = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const completeTask = (id) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    setVisitHistory((hist) => recordVisit(hist, task.location, task));
    recordTaskAction(task.category, "completed");
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: true } : t)));
  };

  const postponeTask = (id) => {
    const task = tasks.find((t) => t.id === id);
    if (task) recordTaskAction(task.category, "postponed");
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, date: getDateStr(1), postponeCount: (t.postponeCount || 0) + 1 } : t
      )
    );
    setNowTask(null);
  };

  // 알람 트리거 → 감각전환(3초, 배경 유지) → 페이드아웃하며 모달 표시
  const [sensoryActive, setSensoryActive] = useState(false);
  const [sensoryFaded, setSensoryFaded] = useState(false);

  useEffect(() => {
    if (activeAlarm) {
      setSensoryActive(true);
      setSensoryFaded(false);
      setNowTask(activeAlarm);
    }
  }, [activeAlarm]);

  const handleSensoryFinish = () => {
    setSensoryFaded(true);
    dismissAlarm();
  };

  const handleNowDismiss = () => {
    setNowTask(null);
    setSensoryActive(false);
    setSensoryFaded(false);
  };

  // 오늘 / 내일 할 일
  const today = getDateStr(0);
  const tomorrow = getDateStr(1);

  const buildList = (dateStr) =>
    tasks
      .filter((t) => t.date === dateStr)
      .map((t) => ({ ...t, _priority: calcPriority(t) }))
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return b._priority.score - a._priority.score;
      });

  const todayTasks = buildList(today);
  const tomorrowTasks = buildList(tomorrow);

  const todayDone = todayTasks.filter((t) => t.completed).length;
  const tomorrowDone = tomorrowTasks.filter((t) => t.completed).length;

  const alarmQueueCount = activeAlarm
    ? tasks.filter((t) => t.date === today && !t.completed && t.id !== activeAlarm.id).length
    : 0;

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: "#f5f5f5", fontFamily: FONT_FAMILY, position: "relative" }}>
      {/* App header */}
      <div style={{ padding: "20px 24px 8px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#1a1a1a", lineHeight: 1.2 }}>멈춰!</div>
          <div style={{ fontSize: 13, color: "#999", marginTop: 2 }}>할 일을 잊지 마세요</div>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          style={{
            background: "#fff", border: "1px solid #ddd", borderRadius: 12,
            padding: "8px 14px", color: "#666", fontSize: 12, fontWeight: 700,
            fontFamily: FONT_FAMILY, cursor: "pointer", marginTop: 4,
          }}
        >
          ⚙️ 설정
        </button>
      </div>

      {/* 오늘 */}
      <div style={{ padding: "16px 24px 4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: "#1a1a1a" }}>오늘</span>
          <span style={{ fontSize: 12, color: "#999" }}>{todayTasks.length}개</span>
          {todayDone > 0 && (
            <span style={{ fontSize: 11, color: "#2B8A3E", background: "#2B8A3E11", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
              {todayDone}개 완료
            </span>
          )}
        </div>
        {todayTasks.length > 0 ? (
          todayTasks.map((task, i) => (
            <TaskCard
              key={task.id}
              task={task}
              onDelete={deleteTask}
              onComplete={completeTask}
              onTap={(t) => { setNowTask(t); setSensoryFaded(true); }}
            />
          ))
        ) : (
          <div style={{ textAlign: "center", padding: "32px 20px", color: "#ccc" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 14, color: "#aaa" }}>오늘 할 일이 없어요</div>
          </div>
        )}
      </div>

      {/* 내일 */}
      <div style={{ padding: "16px 24px 120px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: "#1a1a1a" }}>내일</span>
          <span style={{ fontSize: 12, color: "#999" }}>{tomorrowTasks.length}개</span>
          {tomorrowDone > 0 && (
            <span style={{ fontSize: 11, color: "#2B8A3E", background: "#2B8A3E11", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
              {tomorrowDone}개 완료
            </span>
          )}
        </div>
        {tomorrowTasks.length > 0 ? (
          tomorrowTasks.map((task, i) => (
            <TaskCard
              key={task.id}
              task={task}
              onDelete={deleteTask}
              onComplete={completeTask}
              onTap={(t) => { setNowTask(t); setSensoryFaded(true); }}
            />
          ))
        ) : (
          <div style={{ textAlign: "center", padding: "32px 20px", color: "#ccc" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 14, color: "#aaa" }}>내일 할 일이 없어요</div>
          </div>
        )}
      </div>

      {/* FAB */}
      <div style={{ position: "fixed", bottom: 32, right: 24, zIndex: 100 }}>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "14px 22px", borderRadius: 50,
            border: "none", cursor: "pointer",
            background: "#1a1a1a", color: "#fff",
            fontSize: 14, fontWeight: 700, fontFamily: FONT_FAMILY,
            boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(0,0,0,0.25)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.18)"; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>할 일 추가</span>
        </button>
      </div>

      {/* 감각 전환 배경 — 모달이 열려도 유지, 페이드아웃 */}
      {sensoryActive && nowTask && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 840,
          opacity: sensoryFaded ? 0.3 : 1,
          transition: "opacity 0.8s ease",
        }}>
          <SensoryAlarm
            task={nowTask}
            media={media}
            onFinish={handleSensoryFinish}
          />
        </div>
      )}

      {/* 상세 모달 — 감각 전환 위에 표시 */}
      {nowTask && sensoryFaded && (
        <NowTaskModal
          task={nowTask}
          onConfirm={handleNowDismiss}
        />
      )}

      {showAddModal && (
        <AddTaskModal
          initDate={today}
          onAdd={addTask}
          onClose={() => setShowAddModal(false)}
        />
      )}
      {showSettings && (
        <SettingsScreen
          media={media}
          setMedia={setMedia}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
