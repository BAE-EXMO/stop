import { useState, useEffect, useMemo, useCallback } from "react";
import { CATEGORIES } from "./constants/categories";
import { FONT_FAMILY } from "./constants/fonts";
import { getDateStr, getDateLabel } from "./utils/dateUtils";
import { calcPriority, getPriorityLabel, getDeadlineInfo } from "./utils/priorityUtils";
import { createSampleTasks } from "./data/sampleTasks";
import { DEFAULT_VISIT_HISTORY } from "./data/visitHistory";
import { DEFAULT_MEDIA } from "./data/defaultPhotos";
import usePersistedState from "./hooks/usePersistedState";
import useAlarmScheduler from "./hooks/useAlarmScheduler";
import { recordVisit } from "./utils/visitHistoryManager";
import { recordTaskAction } from "./utils/behaviorTracker";
import { DEFAULT_PET, calcReward, POSTPONE_PENALTY } from "./utils/petSystem";

import SensoryAlarm from "./components/SensoryAlarm/SensoryAlarm";
import SettingsScreen from "./components/SettingsScreen/SettingsScreen";
import AddTaskModal from "./components/AddTaskModal/AddTaskModal";
import TaskCard from "./components/TaskCard/TaskCard";
import PetWidget from "./components/PetWidget/PetWidget";
import { PetFeedOverlay, PetSadOverlay } from "./components/PetOverlay/PetOverlay";

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
  const [tappedTask, setTappedTask] = useState(null);
  const [selDate, setSelDate] = useState(getDateStr(0));

  // Pet 시스템
  const [pet, setPet] = usePersistedState("memchwo-pet", DEFAULT_PET);
  const [petType, setPetType] = usePersistedState("memchwo-pet-type", "dog");
  const [feedOverlay, setFeedOverlay] = useState(null);
  const [sadOverlay, setSadOverlay] = useState(null);

  // PWA 설치 프롬프트
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
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
  const addTask = useCallback((task) => { setTasks((prev) => [...prev, task]); setShowAddModal(false); }, [setTasks]);
  const deleteTask = useCallback((id) => setTasks((prev) => prev.filter((t) => t.id !== id)), [setTasks]);

  const completeTask = (id) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    setVisitHistory((hist) => recordVisit(hist, task.location, task));
    recordTaskAction(task.category, "completed");
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: true } : t)));

    // Pet 보상
    const { gained, reason } = calcReward(task, pet.streak);
    setPet((p) => ({
      ...p,
      hp: Math.min(100, p.hp + gained),
      xp: p.xp + gained,
      completions: p.completions + 1,
      streak: p.streak + 1,
    }));
    setFeedOverlay({ gained, reason });
  };

  const postponeTask = (id) => {
    const task = tasks.find((t) => t.id === id);
    if (task) recordTaskAction(task.category, "postponed");
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, date: getDateStr(1), postponeCount: (t.postponeCount || 0) + 1 } : t
      )
    );

    // Pet 벌칙
    setPet((p) => ({ ...p, hp: Math.max(0, p.hp - POSTPONE_PENALTY), streak: 0 }));
    setSadOverlay({ lost: POSTPONE_PENALTY });
  };

  // ─── 알람 핸들러 ───
  const handleAlarmDismiss = () => { dismissAlarm(); releaseScreen(); };
  const handleAlarmSnooze = () => { snoozeAlarm(); releaseScreen(); };
  const handleAlarmPostpone = () => {
    if (activeAlarm) postponeTask(activeAlarm.id);
    dismissAlarm(); releaseScreen();
  };

  const handleTaskTap = (task) => setTappedTask(task);
  const handleTappedDismiss = () => setTappedTask(null);
  const handleTappedPostpone = () => {
    if (tappedTask) postponeTask(tappedTask.id);
    setTappedTask(null);
  };

  // 감각전환 중 탭 visibility
  useEffect(() => {
    if (!activeAlarm) return;
    const onVisible = () => {
      if (document.visibilityState === "visible" && activeAlarm) takeoverScreen();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [activeAlarm]);

  // ─── 날짜 탭 ───
  const allDates = useMemo(() =>
    [...new Set([getDateStr(0), getDateStr(1), ...tasks.map((t) => t.date)])]
      .filter((d) => d >= getDateStr(0))
      .sort(),
    [tasks]
  );

  // 선택된 날짜의 태스크 (우선순위+마감 부스트 정렬)
  const filtered = useMemo(() =>
    tasks
      .filter((t) => t.date === selDate)
      .map((t) => {
        const p = calcPriority(t);
        const dl = getDeadlineInfo(t);
        let bonus = 0;
        if (dl) {
          if (dl.urgency >= 3) bonus = 40;
          else if (dl.urgency >= 2) bonus = 25;
          else if (dl.urgency >= 1) bonus = 10;
        }
        if ((t.postponeCount || 0) >= 3) bonus += 15;
        else if ((t.postponeCount || 0) >= 2) bonus += 8;
        return { ...t, _pri: { ...p, score: Math.min(100, p.score + bonus) } };
      })
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return b._pri.score - a._pri.score;
      }),
    [tasks, selDate]
  );

  const doneCount = filtered.filter((t) => t.completed).length;
  const hasAISort = filtered.length > 1 && filtered.some((t) => !t.time);

  // "가장 먼저" — 모든 미래 태스크 중 가장 긴급한 것
  const nextTask = useMemo(() =>
    [...tasks]
      .filter((t) => !t.completed && t.date >= getDateStr(0))
      .map((t) => ({ ...t, _pri: calcPriority(t) }))
      .sort((a, b) => a.date === b.date ? b._pri.score - a._pri.score : a.date.localeCompare(b.date))
      [0] || null,
    [tasks]
  );

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: "var(--bg-primary)", fontFamily: FONT_FAMILY, position: "relative", paddingBottom: 100 }}>
      {/* App header */}
      <div style={{ padding: "24px 24px 8px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "var(--text-primary)", lineHeight: 1.2, letterSpacing: -0.5 }}>STOP.</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, letterSpacing: 1 }}>DO IT NOW</div>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          {installPrompt && (
            <button onClick={handleInstall} style={{
              background: "linear-gradient(135deg, #0891b2, #0e7490)", border: "none", borderRadius: 10,
              padding: "8px 14px", color: "#fff", fontSize: 12, fontWeight: 700,
              fontFamily: FONT_FAMILY, cursor: "pointer", boxShadow: "0 2px 12px #0891b233",
            }}>📲 설치</button>
          )}
          <button onClick={() => setShowSettings(true)} style={{
            background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 10,
            padding: "8px 14px", color: "var(--text-secondary)", fontSize: 12, fontWeight: 600,
            fontFamily: FONT_FAMILY, cursor: "pointer",
          }}>⚙️ 설정</button>
        </div>
      </div>

      {/* Pet 위젯 */}
      <div style={{ padding: "8px 24px 4px" }}>
        <PetWidget pet={pet} petType={petType} onClick={() => setShowSettings(true)} />
      </div>

      {/* 날짜 탭 */}
      <div style={{ padding: "12px 0 4px", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ display: "inline-flex", gap: 8, padding: "0 24px" }}>
          {allDates.map((d) => {
            const sel = d === selDate;
            const cnt = tasks.filter((t) => t.date === d).length;
            return (
              <button key={d} onClick={() => setSelDate(d)} style={{
                padding: "10px 18px", borderRadius: 14,
                border: `1.5px solid ${sel ? "#0891b2" : "var(--border)"}`,
                background: sel ? "#0891b218" : "var(--card-bg)",
                color: sel ? "#0891b2" : "var(--text-secondary)",
                fontSize: 14, fontWeight: sel ? 800 : 500,
                fontFamily: FONT_FAMILY, cursor: "pointer", flexShrink: 0,
              }}>
                {getDateLabel(d)}
                {cnt > 0 && (
                  <span style={{
                    display: "inline-block", marginLeft: 6,
                    background: sel ? "#0891b2" : "var(--border)",
                    color: sel ? "#fff" : "var(--text-muted)",
                    fontSize: 11, fontWeight: 700, borderRadius: 8, padding: "1px 7px",
                  }}>{cnt}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 날짜 섹션 헤더 */}
      <div style={{
        padding: "8px 24px 4px", fontSize: 12, fontWeight: 700,
        color: "var(--text-muted)", letterSpacing: 2,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span>{getDateLabel(selDate)} · {filtered.length}개</span>
        <span style={{ fontSize: 10, color: "#1C7ED6", background: "#1C7ED611", padding: "2px 8px", borderRadius: 4 }}>우선순위순</span>
        {doneCount > 0 && (
          <span style={{ fontSize: 10, color: "#2B8A3E", background: "#2B8A3E11", padding: "2px 8px", borderRadius: 4 }}>
            ✅ {doneCount}개 완료
          </span>
        )}
      </div>

      {/* 태스크 리스트 */}
      <div style={{ padding: "8px 24px 0" }}>
        {filtered.map((task, i) => (
          <TaskCard
            key={task.id}
            task={task}
            rank={i + 1}
            onDelete={deleteTask}
            onComplete={completeTask}
            onPostpone={postponeTask}
            onAlarm={triggerAlarm}
            onTap={handleTaskTap}
          />
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "50px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>🎯</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>
              {getDateLabel(selDate)}은 비어있어요
            </div>
          </div>
        )}
      </div>

      {/* 플로팅 FAB */}
      <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 100 }}>
        <button onClick={() => setShowAddModal(true)} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "16px 32px", borderRadius: 14, border: "none",
          background: "linear-gradient(135deg, #0891b2, #0e7490)", color: "#fff",
          fontSize: 16, fontWeight: 800, fontFamily: FONT_FAMILY, cursor: "pointer",
          animation: "floatPulse 3s ease-in-out infinite",
          boxShadow: "0 8px 32px #0891b255",
        }}>
          <span style={{ fontSize: 22, lineHeight: 1 }}>+</span>
          <span>할 일 추가</span>
        </button>
      </div>

      {/* 알람 → SensoryAlarm */}
      {activeAlarm && (
        <SensoryAlarm
          task={activeAlarm} media={media}
          snoozeCount={getSnoozeCount(activeAlarm.id)}
          skipSensory={alarmMode === "urgent"}
          onDismiss={handleAlarmDismiss} onSnooze={handleAlarmSnooze} onPostpone={handleAlarmPostpone}
        />
      )}

      {/* 태스크 카드 탭 → 바로 정보 */}
      {tappedTask && !activeAlarm && (
        <SensoryAlarm
          task={tappedTask} media={media} snoozeCount={0} skipSensory
          onDismiss={handleTappedDismiss} onSnooze={handleTappedDismiss} onPostpone={handleTappedPostpone}
        />
      )}

      {showAddModal && (
        <AddTaskModal initDate={selDate} onAdd={addTask} onClose={() => setShowAddModal(false)} visitHistory={visitHistory} />
      )}
      {showSettings && (
        <SettingsScreen
          media={media} setMedia={setMedia}
          pet={pet} setPet={setPet} petType={petType} setPetType={setPetType}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Pet 오버레이 */}
      {feedOverlay && (
        <PetFeedOverlay pet={pet} petType={petType} gained={feedOverlay.gained} reason={feedOverlay.reason} onClose={() => setFeedOverlay(null)} />
      )}
      {sadOverlay && (
        <PetSadOverlay pet={pet} petType={petType} lost={sadOverlay.lost} onClose={() => setSadOverlay(null)} />
      )}
    </div>
  );
}
