import { useState, useEffect } from "react";
import { CATEGORIES } from "../../constants/categories";
import { calcPriority, getPriorityLabel } from "../../utils/priorityUtils";
import { formatTime, subtractMinutes } from "../../utils/dateUtils";
import { getDeadlineInfo } from "../../utils/priorityUtils";
import useSensoryAudio from "../../hooks/useSensoryAudio";
import styles from "./SensoryAlarm.module.css";

export default function SensoryAlarm({ task, photos, onDismiss, onSnooze, queueCount }) {
  const [phase, setPhase] = useState(1);
  const [photoIdx] = useState(() => Math.floor(Math.random() * photos.length));
  const [countdownSec, setCountdownSec] = useState(4);
  const [prepChecklist, setPrepChecklist] = useState(() => task.prepItems.map((p) => ({ ...p })));
  const [pulse, setPulse] = useState(true);
  const [particles] = useState(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 4 + Math.random() * 12,
      duration: 3 + Math.random() * 4,
      delay: Math.random() * 2,
      opacity: 0.3 + Math.random() * 0.5,
    }))
  );

  // 오디오: Phase 1에서만 재생
  const { stop: stopAudio } = useSensoryAudio(phase === 1);

  const allPrepDone = prepChecklist.every((p) => p.done);
  const categoryInfo = CATEGORIES[task.category];
  const priority = calcPriority(task);
  const priorityLabel = getPriorityLabel(priority.score);
  const departureTime = task.time ? subtractMinutes(task.time, task.travelTime) : null;
  const deadlineInfo = getDeadlineInfo(task);

  // Phase 1 countdown
  useEffect(() => {
    if (phase !== 1) return;
    const timer = setInterval(() => {
      setCountdownSec((c) => {
        if (c <= 1) {
          clearInterval(timer);
          setPhase(2);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  // Pulse animation
  useEffect(() => {
    const interval = setInterval(() => setPulse((v) => !v), 800);
    return () => clearInterval(interval);
  }, []);

  const togglePrep = (index) => {
    setPrepChecklist((prev) =>
      prev.map((p, i) => (i === index ? { ...p, done: !p.done } : p))
    );
  };

  // ─── Phase 1: Sensory break ───
  if (phase === 1) {
    return (
      <div className={styles.phase1}>
        <div
          className={styles.backgroundPhoto}
          style={{ backgroundImage: `url(${photos[photoIdx]})` }}
        />

        {particles.map((p) => (
          <div
            key={p.id}
            className={styles.particle}
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              background: `radial-gradient(circle, rgba(255,255,255,${p.opacity}), transparent)`,
              animation: `floatUp ${p.duration}s ease-in-out ${p.delay}s infinite`,
              "--particle-opacity": p.opacity,
            }}
          />
        ))}

        <div className={styles.pulseRing} />
        <div className={styles.pulseRingDelayed} />

        <div className={styles.phase1Content}>
          <div className={styles.musicBars}>
            {Array.from({ length: 12 }, (_, i) => (
              <div
                key={i}
                className={styles.musicBar}
                style={{
                  background: `linear-gradient(to top, ${categoryInfo.color}, rgba(255,255,255,0.8))`,
                  height: `${20 + Math.random() * 80}%`,
                  animation: `musicBar${i % 3} ${0.4 + Math.random() * 0.6}s ease-in-out infinite alternate`,
                }}
              />
            ))}
          </div>

          <div className={styles.pauseLabel}>🎵 잠시 멈추세요</div>
          <div className={styles.phase1Title}>
            {categoryInfo.icon} {task.title}
          </div>
          <div className={styles.countdown}>{countdownSec}초 후 상세 정보가 표시됩니다</div>

          <button className={styles.skipBtn} onClick={() => setPhase(2)}>
            바로 확인하기 →
          </button>
        </div>
      </div>
    );
  }

  // ─── Phase 2: Task info ───
  return (
    <div className={styles.phase2}>
      <div
        className={styles.phase2PhotoRemnant}
        style={{ backgroundImage: `url(${photos[photoIdx]})` }}
      />

      <div className={styles.phase2Scroll}>
        <div className={styles.phase2Inner}>
          {/* Header */}
          <div
            className={styles.taskHeader}
            style={{
              background: `linear-gradient(135deg, ${categoryInfo.color}22, ${categoryInfo.color}44)`,
              border: `1px solid ${categoryInfo.color}33`,
            }}
          >
            <div className={styles.taskHeaderLabel} style={{ color: categoryInfo.color }}>
              ⚡ 지금 멈추세요
            </div>
            <div className={styles.taskHeaderTitle}>
              {categoryInfo.icon} {task.title}
            </div>

            {task.time ? (
              <div className={styles.taskHeaderTime}>{task.time}까지 도착</div>
            ) : (
              <div className={styles.taskHeaderPriority} style={{ color: priorityLabel.color }}>
                {priorityLabel.icon} AI: {priorityLabel.text}
              </div>
            )}

            {queueCount > 0 && (
              <div className={styles.queueCount}>다음 할 일 {queueCount}개 대기</div>
            )}

            {deadlineInfo && deadlineInfo.urgency >= 1 && (
              <div
                className={styles.deadlineInAlarm}
                style={{
                  background: `${deadlineInfo.color}15`,
                  border: `1px solid ${deadlineInfo.color}33`,
                }}
              >
                <div className={styles.deadlineInAlarmText} style={{ color: deadlineInfo.color }}>
                  {deadlineInfo.msg}
                </div>
              </div>
            )}
          </div>

          {/* Info cards */}
          <div className={styles.infoCards}>
            <div className={styles.infoCard}>
              <div className={styles.infoCardLabel}>이동시간</div>
              <div className={styles.infoCardValue} style={{ color: categoryInfo.color }}>
                {formatTime(task.travelTime)}
              </div>
            </div>
            <div className={styles.infoCard}>
              <div className={styles.infoCardLabel}>
                {task.time ? "출발시각" : "우선순위"}
              </div>
              <div className={styles.infoCardValue} style={{ color: "#fff" }}>
                {departureTime || `${priority.score}점`}
              </div>
            </div>
          </div>

          {/* Location */}
          <div className={styles.locationBar}>
            <span style={{ fontSize: 18 }}>📍</span>
            <span className={styles.locationText}>{task.location}</span>
          </div>

          {/* Prep checklist */}
          <div className={styles.prepSection}>
            <div className={styles.prepTitle}>
              ✅ 준비 체크리스트 ({prepChecklist.filter((p) => p.done).length}/{prepChecklist.length})
            </div>
            {prepChecklist.map((item, idx) => (
              <div
                key={idx}
                className={styles.prepItem}
                onClick={() => togglePrep(idx)}
                style={{
                  background: item.done ? `${categoryInfo.color}12` : "#222",
                  border: `1px solid ${item.done ? categoryInfo.color + "44" : "#333"}`,
                }}
              >
                <div
                  className={styles.prepCheckbox}
                  style={{
                    border: `2px solid ${item.done ? categoryInfo.color : "#444"}`,
                    background: item.done ? categoryInfo.color : "transparent",
                  }}
                >
                  {item.done ? "✓" : ""}
                </div>
                <span
                  className={styles.prepText}
                  style={{
                    color: item.done ? "#888" : "#ddd",
                    textDecoration: item.done ? "line-through" : "none",
                  }}
                >
                  {item.text}
                </span>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className={styles.phase2Buttons}>
            <button className={styles.snoozeBtn} onClick={onSnooze}>5분 뒤</button>
            <button
              className={styles.dismissBtn}
              style={{
                background: allPrepDone
                  ? categoryInfo.color
                  : `linear-gradient(135deg, ${categoryInfo.color}, ${categoryInfo.color}cc)`,
                boxShadow: `0 4px 20px ${categoryInfo.color}44`,
              }}
              onClick={onDismiss}
            >
              {allPrepDone ? "출발! 🚀" : "확인"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
