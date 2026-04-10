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

import { takeoverScreen, releaseScreen } from "./utils/screenTakeover";
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
      position: "fixed", inset: 0, zIndex: 850, display: "flex", alignItems: "flex-start", justifyContent: "flex-end",
      background: "rgba(0,0,0,0.15)",
      backdropFilter: "blur(8px)",
      padding: "16px",
    }}>
      <div style={{
        width: "100%", maxWidth: 340, borderRadius: 18,
        background: "#fff", border: "1px solid #e8eaed", padding: "24px 20px",
        fontFamily: FONT_FAMILY, maxHeight: "80vh", overflowY: "auto",
        boxShadow: "0 8px 40px rgba(0,0,0,0.1)",
        animation: "slideInRight 0.3s ease-out",
      }}>
        {/* 슬로건 */}
        <div style={{
          textAlign: "center", marginBottom: 16, padding: "12px 0",
          borderBottom: "2px solid #1a1a2e",
        }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#0891b2", letterSpacing: 3, lineHeight: 1 }}>
            STOP & DO IT
          </div>
        </div>

        {/* 헤더 */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>{categoryInfo.icon}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e" }}>{task.title}</div>
        </div>

        {/* 상태 뱃지 */}
        {(hasDeadline || hasPostpone) && (
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16, flexWrap: "wrap" }}>
            {hasDeadline && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 6,
                background: "#0891b210", color: "#0891b2", border: "1px solid #0891b233",
              }}>
                📅 마감 {task.deadline}
              </span>
            )}
            {hasPostpone && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 6,
                background: task.postponeCount >= 3 ? "#ef444410" : "#f59e0b10",
                color: task.postponeCount >= 3 ? "#ef4444" : "#e67700",
                border: `1px solid ${task.postponeCount >= 3 ? "#ef444433" : "#e6770033"}`,
              }}>
                {task.postponeCount >= 3 ? "😤" : "⏰"} {task.postponeCount}번 미룸
              </span>
            )}
          </div>
        )}

        {/* 정보 행 */}
        {infoRows.length > 0 && (
          <div style={{
            background: "#f7f8fa", borderRadius: 12, border: "1px solid #e8eaed",
            padding: "4px 0", marginBottom: 12,
          }}>
            {infoRows.map((row, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
                borderTop: i > 0 ? "1px solid #f0f2f5" : "none",
              }}>
                <span style={{ fontSize: 14, width: 24, textAlign: "center", flexShrink: 0 }}>{row.icon}</span>
                <span style={{ fontSize: 11, color: "#999", width: 56, flexShrink: 0 }}>{row.label}</span>
                <span style={{ fontSize: 13, color: "#333", fontWeight: 600 }}>{row.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* 메모 · 준비물 */}
        {hasNotes && (
          <div style={{
            background: "#f7f8fa", borderRadius: 12, padding: "14px 16px", marginBottom: 16,
            border: "1px solid #e8eaed",
          }}>
            <div style={{ fontSize: 11, color: "#999", fontWeight: 700, marginBottom: 8 }}>📋 내용 · 준비물</div>
            {task.prepItems.map((item, i) => (
              <div key={i} style={{ fontSize: 13, color: "#555", lineHeight: 1.8, paddingLeft: 4 }}>· {item.text}</div>
            ))}
          </div>
        )}

        {/* 확인함 버튼 */}
        <button
          onClick={onConfirm}
          style={{
            width: "100%", padding: 14, borderRadius: 12, border: "none",
            background: "linear-gradient(135deg, #0891b2, #0e7490)", color: "#fff",
            fontSize: 15, fontWeight: 800,
            fontFamily: FONT_FAMILY, cursor: "pointer",
            boxShadow: "0 4px 20px #0891b222",
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

  // PWA 설치 프롬프트
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === "accepted") setInstallPrompt(null);
  };

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

  // 알람 트리거 → 감각전환(10초, 배경 유지) → 페이드아웃하며 모달 표시
  const [sensoryActive, setSensoryActive] = useState(false);
  const [sensoryFaded, setSensoryFaded] = useState(false);

  useEffect(() => {
    if (activeAlarm) {
      setSensoryActive(true);
      setSensoryFaded(false);
      setNowTask(activeAlarm);
    }
  }, [activeAlarm]);

  // 감각전환 중 탭이 다시 보이면 풀스크린 재시도
  useEffect(() => {
    if (!sensoryActive) return;
    const onVisible = () => {
      if (document.visibilityState === "visible" && sensoryActive) {
        takeoverScreen();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [sensoryActive]);

  const handleSensoryFinish = () => {
    setSensoryFaded(true);
    dismissAlarm();
  };

  const handleNowDismiss = () => {
    setNowTask(null);
    setSensoryActive(false);
    setSensoryFaded(false);
    releaseScreen();
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
    <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: "#f7f8fa", fontFamily: FONT_FAMILY, position: "relative" }}>
      {/* App header */}
      <div style={{ padding: "24px 24px 8px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#1a1a2e", lineHeight: 1.2, letterSpacing: -0.5 }}>STOP.</div>
          <div style={{ fontSize: 12, color: "#999", marginTop: 4, letterSpacing: 1 }}>DO IT NOW</div>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          {installPrompt && (
            <button
              onClick={handleInstall}
              style={{
                background: "linear-gradient(135deg, #0891b2, #0e7490)", border: "none", borderRadius: 10,
                padding: "8px 14px", color: "#fff", fontSize: 12, fontWeight: 700,
                fontFamily: FONT_FAMILY, cursor: "pointer",
                boxShadow: "0 2px 12px #0891b233",
              }}
            >
              📲 설치
            </button>
          )}
          <button
            onClick={() => setShowSettings(true)}
            style={{
              background: "#fff", border: "1px solid #e8eaed", borderRadius: 10,
              padding: "8px 14px", color: "#666", fontSize: 12, fontWeight: 600,
              fontFamily: FONT_FAMILY, cursor: "pointer",
              transition: "border-color 0.2s",
            }}
          >
            ⚙️ 설정
          </button>
        </div>
      </div>

      {/* 할 일 추가 버튼 */}
      <div style={{ padding: "12px 24px 0" }}>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "14px 0", borderRadius: 12,
            border: "1px dashed #d0d5dd", cursor: "pointer",
            background: "#fff", color: "#999",
            fontSize: 13, fontWeight: 600, fontFamily: FONT_FAMILY,
            transition: "background 0.2s, border-color 0.2s, color 0.2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f8ff"; e.currentTarget.style.borderColor = "#0891b266"; e.currentTarget.style.color = "#0891b2"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#d0d5dd"; e.currentTarget.style.color = "#999"; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>할 일 추가</span>
        </button>
      </div>

      {/* 오늘 */}
      <div style={{ padding: "20px 24px 4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#1a1a2e", letterSpacing: 0.5 }}>TODAY</span>
          <span style={{ fontSize: 11, color: "#aaa", fontWeight: 500 }}>{todayTasks.length}</span>
          {todayDone > 0 && (
            <span style={{ fontSize: 10, color: "#10b981", background: "#10b98112", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
              {todayDone} done
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
          <div style={{ textAlign: "center", padding: "32px 20px" }}>
            <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.5 }}>✨</div>
            <div style={{ fontSize: 13, color: "#bbb" }}>오늘 할 일이 없어요</div>
          </div>
        )}
      </div>

      {/* 내일 */}
      <div style={{ padding: "20px 24px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#1a1a2e", letterSpacing: 0.5 }}>TOMORROW</span>
          <span style={{ fontSize: 11, color: "#aaa", fontWeight: 500 }}>{tomorrowTasks.length}</span>
          {tomorrowDone > 0 && (
            <span style={{ fontSize: 10, color: "#10b981", background: "#10b98112", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
              {tomorrowDone} done
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
          <div style={{ textAlign: "center", padding: "32px 20px" }}>
            <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.5 }}>📋</div>
            <div style={{ fontSize: 13, color: "#bbb" }}>내일 할 일이 없어요</div>
          </div>
        )}
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
