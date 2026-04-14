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

export default function App() {
  const [tasks, setTasks] = usePersistedState("memchwo-tasks", createSampleTasks);
  const [visitHistory, setVisitHistory] = usePersistedState("memchwo-visit-history", DEFAULT_VISIT_HISTORY);
  const [media, setMedia] = usePersistedState("memchwo-media", DEFAULT_MEDIA);
  const {
    activeAlarm, alarmMode, getSnoozeCount,
    dismissAlarm, snoozeAlarm, triggerAlarm,
  } = useAlarmScheduler(tasks);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  // 태스크 카드 탭 → 바로 정보 카드 표시 (감각 전환 없이)
  const [tappedTask, setTappedTask] = useState(null);

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
  };

  // ─── 알람 핸들러 ───

  const handleAlarmDismiss = () => {
    dismissAlarm();
    releaseScreen();
  };

  const handleAlarmSnooze = () => {
    snoozeAlarm();
    releaseScreen();
  };

  const handleAlarmPostpone = () => {
    if (activeAlarm) {
      postponeTask(activeAlarm.id);
    }
    dismissAlarm();
    releaseScreen();
  };

  // 태스크 카드 탭 → 감각 전환 없이 바로 정보 표시
  const handleTaskTap = (task) => {
    setTappedTask(task);
  };

  const handleTappedDismiss = () => {
    setTappedTask(null);
  };

  const handleTappedPostpone = () => {
    if (tappedTask) {
      postponeTask(tappedTask.id);
    }
    setTappedTask(null);
  };

  // 감각전환 중 탭이 다시 보이면 풀스크린 재시도
  useEffect(() => {
    if (!activeAlarm) return;
    const onVisible = () => {
      if (document.visibilityState === "visible" && activeAlarm) {
        takeoverScreen();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [activeAlarm]);

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
          todayTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onDelete={deleteTask}
              onComplete={completeTask}
              onTap={handleTaskTap}
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
          tomorrowTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onDelete={deleteTask}
              onComplete={completeTask}
              onTap={handleTaskTap}
            />
          ))
        ) : (
          <div style={{ textAlign: "center", padding: "32px 20px" }}>
            <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.5 }}>📋</div>
            <div style={{ fontSize: 13, color: "#bbb" }}>내일 할 일이 없어요</div>
          </div>
        )}
      </div>

      {/* 알람 트리거 → SensoryAlarm (5단계 통합) */}
      {activeAlarm && (
        <SensoryAlarm
          task={activeAlarm}
          media={media}
          snoozeCount={getSnoozeCount(activeAlarm.id)}
          onDismiss={handleAlarmDismiss}
          onSnooze={handleAlarmSnooze}
          onPostpone={handleAlarmPostpone}
        />
      )}

      {/* 태스크 카드 탭 → 감각 전환 없이 바로 정보 표시 */}
      {tappedTask && !activeAlarm && (
        <SensoryAlarm
          task={tappedTask}
          media={media}
          snoozeCount={0}
          skipSensory
          onDismiss={handleTappedDismiss}
          onSnooze={handleTappedDismiss}
          onPostpone={handleTappedPostpone}
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
