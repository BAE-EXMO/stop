import { useState } from "react";
import { CATEGORIES } from "./constants/categories";
import { FONT_FAMILY } from "./constants/fonts";
import { getDateStr, getDateLabel, formatTime } from "./utils/dateUtils";
import { calcPriority, getPriorityLabel, getDeadlineInfo } from "./utils/priorityUtils";
import { createSampleTasks } from "./data/sampleTasks";
import { DEFAULT_VISIT_HISTORY } from "./data/visitHistory";
import { DEFAULT_PHOTOS } from "./data/defaultPhotos";
import usePersistedState from "./hooks/usePersistedState";
import useAlarmScheduler from "./hooks/useAlarmScheduler";
import { recordVisit } from "./utils/visitHistoryManager";
import { recordTaskAction } from "./utils/behaviorTracker";

import SensoryAlarm from "./components/SensoryAlarm/SensoryAlarm";
import SettingsScreen from "./components/SettingsScreen/SettingsScreen";
import AddTaskModal from "./components/AddTaskModal/AddTaskModal";
import TaskCard from "./components/TaskCard/TaskCard";

import "./styles/global.css";

export default function App() {
  const [tasks, setTasks] = usePersistedState("memchwo-tasks", createSampleTasks);
  const [visitHistory, setVisitHistory] = usePersistedState("memchwo-visit-history", DEFAULT_VISIT_HISTORY);
  const [photos, setPhotos] = usePersistedState("memchwo-photos", DEFAULT_PHOTOS);
  const { activeAlarm, dismissAlarm, snoozeAlarm, triggerAlarm } = useAlarmScheduler(tasks);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getDateStr(0));

  // Task CRUD
  const addTask = (task) => {
    setTasks((prev) => [...prev, task]);
    setShowAddModal(false);
  };

  const deleteTask = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const completeTask = (id) => {
    setTasks((prev) => prev.map((t) => {
      if (t.id !== id) return t;
      // 방문 이력 + 행동 패턴 기록
      setVisitHistory((hist) => recordVisit(hist, t.location, t));
      recordTaskAction(t.category, "completed");
      return { ...t, completed: true };
    }));
  };

  const postponeTask = (id) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        recordTaskAction(t.category, "postponed");
        return { ...t, date: getDateStr(1), postponeCount: (t.postponeCount || 0) + 1 };
      })
    );
  };

  // Derived data
  const allDates = [...new Set([getDateStr(0), getDateStr(1), ...tasks.map((t) => t.date)])].sort();

  const filteredTasks = tasks
    .filter((t) => t.date === selectedDate)
    .map((t) => {
      const priority = calcPriority(t);
      const deadlineInfo = getDeadlineInfo(t);

      let bonus = 0;
      if (deadlineInfo) {
        if (deadlineInfo.urgency >= 3) bonus = 40;
        else if (deadlineInfo.urgency >= 2) bonus = 25;
        else if (deadlineInfo.urgency >= 1) bonus = 10;
      }
      if (t.postponeCount >= 3) bonus += 15;
      else if (t.postponeCount >= 2) bonus += 8;

      return {
        ...t,
        _priority: {
          ...priority,
          score: Math.min(100, priority.score + bonus),
          reasons: [...priority.reasons, ...(deadlineInfo ? [deadlineInfo.msg] : [])],
        },
      };
    })
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return b._priority.score - a._priority.score;
    });

  // Next upcoming task
  const nextTask = [...tasks]
    .map((t) => ({ ...t, _priority: calcPriority(t) }))
    .filter((t) => t.date >= getDateStr(0))
    .sort((a, b) =>
      a.date === b.date ? b._priority.score - a._priority.score : a.date.localeCompare(b.date)
    )[0];

  const alarmQueueCount = activeAlarm
    ? filteredTasks.filter((t) => t.id !== activeAlarm.id).length
    : 0;

  const completedCount = filteredTasks.filter((t) => t.completed).length;
  const hasAiSorted = filteredTasks.length > 1 && filteredTasks.some((t) => !t.hasTime);

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: "#0a0a0a", fontFamily: FONT_FAMILY, position: "relative" }}>
      {/* Status bar */}
      <div style={{ padding: "14px 24px 8px", display: "flex", justifyContent: "space-between", color: "#666", fontSize: 12 }}>
        <span style={{ fontWeight: 700 }}>9:41</span>
        <div style={{ display: "flex", gap: 6 }}><span>📶</span><span>🔋</span></div>
      </div>

      {/* App header */}
      <div style={{ padding: "16px 24px 8px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", lineHeight: 1.2 }}>멈춰!</div>
          <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>AI가 순서를 정해드려요</div>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          style={{
            background: "#151515", border: "1px solid #2a2a2a", borderRadius: 12,
            padding: "8px 14px", color: "#888", fontSize: 12, fontWeight: 700,
            fontFamily: FONT_FAMILY, cursor: "pointer", marginTop: 4,
          }}
        >
          ⚙️ 설정
        </button>
      </div>

      {/* Date tabs */}
      <div style={{ padding: "12px 0 4px", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ display: "inline-flex", gap: 8, padding: "0 24px" }}>
          {allDates.map((d) => {
            const isSelected = d === selectedDate;
            const count = tasks.filter((t) => t.date === d).length;
            return (
              <button
                key={d}
                onClick={() => setSelectedDate(d)}
                style={{
                  padding: "10px 18px", borderRadius: 14,
                  border: `1.5px solid ${isSelected ? "#E8590C" : "#222"}`,
                  background: isSelected ? "#E8590C18" : "#151515",
                  color: isSelected ? "#E8590C" : "#777",
                  fontSize: 14, fontWeight: isSelected ? 800 : 500,
                  fontFamily: FONT_FAMILY, cursor: "pointer", flexShrink: 0,
                }}
              >
                {getDateLabel(d)}
                {count > 0 && (
                  <span style={{
                    display: "inline-block", marginLeft: 6,
                    background: isSelected ? "#E8590C" : "#333",
                    color: isSelected ? "#fff" : "#888",
                    fontSize: 11, fontWeight: 700, borderRadius: 8, padding: "1px 7px",
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* AI sort info */}
      {hasAiSorted && (
        <div style={{ padding: "8px 24px" }}>
          <div style={{
            background: "#1C7ED611", border: "1px solid #1C7ED622", borderRadius: 12,
            padding: "10px 14px", display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 16 }}>🧠</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "#1C7ED6", fontFamily: FONT_FAMILY, fontWeight: 700 }}>AI 스마트 정렬</div>
              <div style={{ fontSize: 11, color: "#888", fontFamily: FONT_FAMILY }}>영업시간·긴급도 기반 순서</div>
            </div>
          </div>
        </div>
      )}

      {/* Next task banner */}
      {nextTask && (
        <div style={{ padding: "8px 24px" }}>
          <div style={{
            background: "#151515", borderRadius: 14, padding: "14px 18px",
            display: "flex", alignItems: "center", gap: 12, border: "1px solid #222",
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: "linear-gradient(135deg,#E8590C22,#E8590C44)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
            }}>
              ⏳
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "#aaa", fontWeight: 700 }}>가장 먼저</div>
              <div style={{ fontSize: 11, color: "#666", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {nextTask.date !== getDateStr(0) ? getDateLabel(nextTask.date) + " · " : ""}{nextTask.title}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#E8590C" }}>{nextTask.time || "AI"}</div>
            </div>
          </div>
        </div>
      )}

      {/* Section header */}
      <div style={{
        padding: "8px 24px 4px", fontSize: 12, fontWeight: 700, color: "#444",
        letterSpacing: 2, display: "flex", alignItems: "center", gap: 8,
      }}>
        <span>{getDateLabel(selectedDate)} · {filteredTasks.length}개</span>
        <span style={{ fontSize: 10, color: "#1C7ED6", background: "#1C7ED611", padding: "2px 8px", borderRadius: 4 }}>우선순위순</span>
        {completedCount > 0 && (
          <span style={{ fontSize: 10, color: "#2B8A3E", background: "#2B8A3E11", padding: "2px 8px", borderRadius: 4 }}>
            ✅ {completedCount}개 완료
          </span>
        )}
      </div>

      {/* Task list */}
      <div style={{ padding: "8px 24px 120px" }}>
        {filteredTasks.map((task, i) => (
          <TaskCard
            key={task.id}
            task={task}
            onAlarm={triggerAlarm}
            onDelete={deleteTask}
            onComplete={completeTask}
            onPostpone={postponeTask}
            rank={i + 1}
          />
        ))}
        {filteredTasks.length === 0 && (
          <div style={{ textAlign: "center", padding: "50px 20px", color: "#444" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: "#555" }}>
              {getDateLabel(selectedDate)}은 비어있어요
            </div>
          </div>
        )}
      </div>

      {/* FAB */}
      <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 100 }}>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            display: "flex", alignItems: "center", gap: 10, padding: "16px 32px",
            borderRadius: 50, border: "none",
            background: "linear-gradient(135deg,#E8590C,#D9480F)",
            color: "#fff", fontSize: 16, fontWeight: 800, fontFamily: FONT_FAMILY,
            cursor: "pointer", animation: "floatPulse 3s ease-in-out infinite",
            boxShadow: "0 8px 32px #E8590C55",
          }}
        >
          <span style={{ fontSize: 22, lineHeight: 1 }}>+</span>
          <span>할 일 추가</span>
        </button>
      </div>

      {/* Modals */}
      {activeAlarm && (
        <SensoryAlarm
          task={activeAlarm}
          photos={photos}
          onDismiss={dismissAlarm}
          onSnooze={snoozeAlarm}
          queueCount={alarmQueueCount}
        />
      )}
      {showAddModal && (
        <AddTaskModal
          initDate={selectedDate}
          onAdd={addTask}
          onClose={() => setShowAddModal(false)}
          visitHistory={visitHistory}
        />
      )}
      {showSettings && (
        <SettingsScreen
          photos={photos}
          setPhotos={setPhotos}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
