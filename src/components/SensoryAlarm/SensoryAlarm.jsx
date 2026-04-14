import { useState, useEffect, useRef, useCallback } from "react";
import { CATEGORIES } from "../../constants/categories";
import { FONT_FAMILY } from "../../constants/fonts";
import useSensoryAudio from "../../hooks/useSensoryAudio";
import { pickMedia, needsMorePhotos } from "../../utils/photoShuffler";
import { calcUrgency, getPhaseTimings, URGENCY_LABELS } from "../../utils/urgencyUtils";
import { recordAlert, getUserPrefs } from "../../utils/alertTracker";
import styles from "./SensoryAlarm.module.css";

/**
 * 5단계 감각 전환 알림 컴포넌트.
 *
 * Phase 1: 청각 선행 자극 (0~1초)
 * Phase 2: 시각 몰입 해제 (1~4초)
 * Phase 3: 전환 브릿지 (4~5초)
 * Phase 4: 정보 전달
 * Phase 5: 행동 유도
 *
 * @param {{ task, media, snoozeCount, onDismiss, onSnooze, onPostpone }} props
 */
export default function SensoryAlarm({ task, media, snoozeCount = 0, skipSensory: skipSensoryProp = false, onDismiss, onSnooze, onPostpone }) {
  const urgency = calcUrgency(task);
  const userPrefs = getUserPrefs();
  const timings = getPhaseTimings(urgency, task.postponeCount || 0, userPrefs.skipRate);

  // 스누즈 2회째, 긴급, 또는 수동 탭이면 감각 전환 스킵
  const shouldSkipSensory = skipSensoryProp || timings.skipSensory || snoozeCount >= 2;

  const [phase, setPhase] = useState(shouldSkipSensory ? 4 : 1);
  const [picked] = useState(() => pickMedia(media));
  const [particles] = useState(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: 4 + Math.random() * 10,
      duration: 3 + Math.random() * 3,
      delay: Math.random() * 2,
      opacity: 0.2 + Math.random() * 0.4,
    }))
  );
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [showSnoozeConfirm, setShowSnoozeConfirm] = useState(false);
  const [textVisible, setTextVisible] = useState(false);

  const categoryInfo = CATEGORIES[task.category] || {};
  const urgencyLabel = URGENCY_LABELS[urgency];
  const phase2StartRef = useRef(null);
  const alertStartRef = useRef(Date.now());

  // 미디어가 동영상이면 자체 오디오 사용
  const isVideo = picked && (picked.type === "video" || picked.type === "reel");
  const [audioPlaying, setAudioPlaying] = useState(!shouldSkipSensory);
  const { stop: stopAudio, fadeOut } = useSensoryAudio(!isVideo && audioPlaying);

  // ─── Phase 자동 진행 타이머 ───
  useEffect(() => {
    if (shouldSkipSensory) return;

    let timer;
    switch (phase) {
      case 1:
        timer = setTimeout(() => setPhase(2), timings.phase1);
        break;
      case 2:
        phase2StartRef.current = Date.now();
        // Phase 2 시작 0.8초 후 텍스트 표시
        setTimeout(() => setTextVisible(true), 800);
        timer = setTimeout(() => setPhase(3), timings.phase2);
        break;
      case 3:
        // 브릿지: 오디오 페이드아웃
        fadeOut(timings.phase3);
        timer = setTimeout(() => {
          setAudioPlaying(false);
          setPhase(4);
        }, timings.phase3);
        break;
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [phase, shouldSkipSensory, timings, fadeOut]);

  // ─── "바로 확인하기" 스킵 ───
  const handleSkip = useCallback(() => {
    const phase2Duration = phase2StartRef.current ? Date.now() - phase2StartRef.current : 0;

    // 스킵 시 음악 0.5초 페이드아웃
    fadeOut(500);
    setTimeout(() => setAudioPlaying(false), 500);

    recordAlert({
      taskId: task.id,
      photoUsed: picked?.url || null,
      phase2Duration,
      skipped: true,
      snoozed: false,
      snoozeCount,
      checklistCompleted: false,
      timeToAction: Date.now() - alertStartRef.current,
    });

    setPhase(4);
  }, [task.id, picked, snoozeCount, fadeOut]);

  // ─── 체크리스트 토글 ───
  const toggleCheck = (index) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const prepItems = task.prepItems || [];
  const allChecked = prepItems.length > 0 && checkedItems.size === prepItems.length;

  // ─── 확인/출발 ───
  const handleConfirm = () => {
    recordAlert({
      taskId: task.id,
      photoUsed: picked?.url || null,
      phase2Duration: phase2StartRef.current ? Date.now() - phase2StartRef.current : 0,
      skipped: false,
      snoozed: false,
      snoozeCount,
      checklistCompleted: allChecked,
      timeToAction: Date.now() - alertStartRef.current,
    });
    onDismiss();
  };

  // ─── 스누즈 처리 ───
  const handleSnooze = () => {
    if (snoozeCount >= 2) {
      setShowSnoozeConfirm(true);
      return;
    }
    recordAlert({
      taskId: task.id,
      photoUsed: picked?.url || null,
      phase2Duration: 0,
      skipped: false,
      snoozed: true,
      snoozeCount: snoozeCount + 1,
      checklistCompleted: false,
      timeToAction: Date.now() - alertStartRef.current,
    });
    onSnooze();
  };

  // ─── 3회째 미루기 확인 → 다음 날로 ───
  const handlePostponeConfirm = () => {
    setShowSnoozeConfirm(false);
    onPostpone();
  };

  // ─── 이동시간/출발시각 계산 ───
  const departureTime = (() => {
    if (!task.time) return null;
    const [h, m] = task.time.split(":").map(Number);
    const total = h * 60 + m - (task.travelTime || 0) - (task.prepTime || 0);
    const dh = Math.floor(total / 60);
    const dm = total % 60;
    return `${String(dh).padStart(2, "0")}:${String(dm < 0 ? 0 : dm).padStart(2, "0")}`;
  })();

  // ─── 기한 압박 메시지 ───
  const deadlineWarning = (() => {
    if (!task.deadline) return null;
    const today = new Date();
    const dl = new Date(task.deadline + "T23:59:59");
    const daysLeft = Math.ceil((dl - today) / 86_400_000);
    if (daysLeft < 0) return { text: `마감 ${Math.abs(daysLeft)}일 초과!`, critical: true };
    if (daysLeft === 0) return { text: "오늘이 마감일입니다!", critical: true };
    if (daysLeft <= 2) return { text: `마감 ${daysLeft}일 남음`, critical: false };
    return null;
  })();

  // ─── 배경 렌더 ───
  const renderBackground = () => {
    if (!picked) return null;

    if (picked.type === "video" || picked.type === "reel") {
      return (
        <video
          className={`${styles.backgroundVideo} ${phase === 3 ? styles.blurOut : ""}`}
          style={timings.tintRed ? { filter: "brightness(0.6) sepia(0.4) hue-rotate(-30deg)" } : undefined}
          src={picked.url}
          autoPlay
          muted={false}
          loop
          playsInline
        />
      );
    }

    return (
      <div
        className={`${styles.backgroundPhoto} ${phase === 3 ? styles.blurOut : ""}`}
        style={{
          backgroundImage: `url(${picked.url})`,
          ...(timings.tintRed ? { filter: "brightness(0.5) sepia(0.5) hue-rotate(-30deg)" } : {}),
        }}
      />
    );
  };

  // ─── 파티클 색상 ───
  const particleColorMap = {
    white: "rgba(255,255,255,",
    red: "rgba(255,80,80,",
    orange: "rgba(255,165,0,",
  };
  const pColor = particleColorMap[timings.particleColor] || particleColorMap.white;

  // ═══════════════════════════════════════════
  // Phase 1~3: 감각 전환 시퀀스
  // ═══════════════════════════════════════════
  if (phase <= 3) {
    return (
      <div className={`${styles.sensoryOverlay} ${phase === 1 ? styles.phase1Enter : ""}`}>
        {/* 배경 사진/동영상 (Phase 2+) */}
        {phase >= 2 && (
          <>
            {renderBackground()}
            <div className={styles.darkOverlay} />
          </>
        )}

        {/* 파티클 (Phase 2) */}
        {phase === 2 && particles.map((p) => (
          <div
            key={p.id}
            className={styles.particle}
            style={{
              left: `${p.x}%`,
              bottom: `-${p.size}px`,
              width: p.size,
              height: p.size,
              background: `radial-gradient(circle, ${pColor}${p.opacity}), transparent)`,
              animation: `floatUp ${p.duration}s ease-in-out ${p.delay}s infinite`,
            }}
          />
        ))}

        {/* 파티클 페이드아웃 (Phase 3) */}
        {phase === 3 && particles.map((p) => (
          <div
            key={p.id}
            className={`${styles.particle} ${styles.particleFadeOut}`}
            style={{
              left: `${p.x}%`,
              bottom: `${20 + Math.random() * 40}%`,
              width: p.size,
              height: p.size,
              background: `radial-gradient(circle, ${pColor}${p.opacity}), transparent)`,
            }}
          />
        ))}

        {/* 펄스 링 (Phase 2) */}
        {phase === 2 && (
          <>
            <div className={styles.pulseRing} />
            <div className={styles.pulseRingDelayed} />
          </>
        )}

        {/* 콘텐츠 */}
        <div className={styles.sensoryContent}>
          {/* 음악 바 (Phase 2+) */}
          {phase >= 2 && (
            <div className={styles.musicBars}>
              {Array.from({ length: 12 }, (_, i) => (
                <div
                  key={i}
                  className={styles.musicBar}
                  style={{
                    background: `linear-gradient(to top, ${categoryInfo.color || "#0891b2"}, rgba(255,255,255,0.8))`,
                    height: `${20 + Math.random() * 80}%`,
                    animation: `musicBar${i % 3} ${0.4 + Math.random() * 0.6}s ease-in-out infinite alternate`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Phase 1: 최소 표시 */}
          {phase === 1 && (
            <div className={styles.phase1Text}>
              <div className={styles.pauseLabel}>🎵 잠시 멈추세요</div>
            </div>
          )}

          {/* Phase 2: 텍스트 (0.8초 지연 후 등장) */}
          {phase >= 2 && textVisible && (
            <div className={styles.textSlideUp}>
              <div className={styles.pauseLabel}>🎵 잠시 멈추세요</div>
              <div className={styles.sensoryTitle}>
                {categoryInfo.icon} {task.title}
              </div>
              <div className={styles.countdown}>
                {phase === 2
                  ? `${Math.ceil(timings.phase2 / 1000)}초 후 상세 정보`
                  : "정보를 불러오는 중..."
                }
              </div>

              {/* 미루기 횟수 표시 */}
              {(task.postponeCount || 0) >= 1 && (
                <div className={styles.postponeWarning} style={{
                  color: (task.postponeCount || 0) >= 3 ? "#ef4444" : "#f59e0b",
                }}>
                  이전에 {task.postponeCount}번 미뤘습니다
                </div>
              )}
            </div>
          )}

          {/* 스킵 버튼 (Phase 2) */}
          {phase === 2 && (
            <button className={styles.skipBtn} onClick={handleSkip}>
              바로 확인하기 →
            </button>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // Phase 4~5: 정보 전달 + 행동 유도
  // ═══════════════════════════════════════════
  const infoRows = [
    task.time && { icon: "⏰", label: "시간", value: `${task.time}까지` },
    task.location && task.location !== "미정" && { icon: "📍", label: "장소", value: task.location },
    task.duration && { icon: "⏱️", label: "소요시간", value: task.duration },
    task.contact && { icon: "📞", label: "연락처", value: task.contact },
    task.attendees && { icon: "👥", label: "참석자", value: task.attendees },
    task.manager && { icon: "👤", label: "담당자", value: task.manager },
  ].filter(Boolean);

  return (
    <div className={styles.infoOverlay}>
      {/* 배경 잔상 */}
      {picked && (
        <div
          className={styles.photoRemnant}
          style={{ backgroundImage: `url(${picked.url})` }}
        />
      )}

      <div className={styles.infoScroll}>
        <div className={styles.infoInner}>

          {/* 헤더 */}
          <div className={styles.infoHeader} style={{
            background: `linear-gradient(135deg, ${categoryInfo.color || "#0891b2"}22, ${categoryInfo.color || "#0891b2"}08)`,
          }}>
            <div className={styles.infoHeaderLabel} style={{ color: categoryInfo.color || "#0891b2" }}>
              ⚡ 지금 멈추세요
            </div>
            <div className={styles.infoHeaderTitle}>
              {categoryInfo.icon} {task.title}
            </div>
            {task.time && (
              <div className={styles.infoHeaderTime}>{task.time}까지 도착</div>
            )}
            {/* 긴급도 뱃지 */}
            <div className={styles.urgencyBadge} style={{
              background: `${urgencyLabel.color}18`,
              color: urgencyLabel.color,
              border: `1px solid ${urgencyLabel.color}33`,
            }}>
              {urgencyLabel.emoji} {urgencyLabel.text}
            </div>
          </div>

          {/* 기한 압박 배너 */}
          {deadlineWarning && (
            <div className={styles.deadlineBanner} style={{
              background: deadlineWarning.critical ? "#ef444418" : "#f59e0b18",
              borderColor: deadlineWarning.critical ? "#ef444444" : "#f59e0b44",
              color: deadlineWarning.critical ? "#ef4444" : "#e67700",
            }}>
              {deadlineWarning.critical ? "🚨" : "📅"} {deadlineWarning.text}
            </div>
          )}

          {/* 이동시간 + 출발시각 카드 */}
          {(task.travelTime || departureTime) && (
            <div className={styles.timeCards}>
              {task.travelTime > 0 && (
                <div className={styles.timeCard}>
                  <div className={styles.timeCardLabel}>🚗 이동시간</div>
                  <div className={styles.timeCardValue}>{task.travelTime}분</div>
                </div>
              )}
              {departureTime && (
                <div className={styles.timeCard}>
                  <div className={styles.timeCardLabel}>🏃 출발시각</div>
                  <div className={styles.timeCardValue} style={{ color: urgencyLabel.color }}>{departureTime}</div>
                </div>
              )}
            </div>
          )}

          {/* 정보 행 */}
          {infoRows.length > 0 && (
            <div className={styles.infoList}>
              {infoRows.map((row, i) => (
                <div key={i} className={styles.infoRow}>
                  <span className={styles.infoRowIcon}>{row.icon}</span>
                  <span className={styles.infoRowLabel}>{row.label}</span>
                  <span className={styles.infoRowValue}>{row.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* 준비 체크리스트 */}
          {prepItems.length > 0 && (
            <div className={styles.checklistSection}>
              <div className={styles.checklistTitle}>
                📋 준비물 체크리스트
                <span className={styles.checklistCount}>
                  {checkedItems.size}/{prepItems.length}
                </span>
              </div>
              {prepItems.map((item, i) => (
                <div
                  key={i}
                  className={`${styles.checklistItem} ${checkedItems.has(i) ? styles.checked : ""}`}
                  onClick={() => toggleCheck(i)}
                >
                  <div className={styles.checkbox} style={{
                    background: checkedItems.has(i) ? (categoryInfo.color || "#0891b2") : "transparent",
                    borderColor: checkedItems.has(i) ? (categoryInfo.color || "#0891b2") : "#444",
                  }}>
                    {checkedItems.has(i) && "✓"}
                  </div>
                  <span className={styles.checklistText}>{item.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* 미루기 횟수 경고 */}
          {(task.postponeCount || 0) >= 1 && (
            <div className={styles.postponeBadge} style={{
              background: (task.postponeCount || 0) >= 3 ? "#ef444412" : "#f59e0b12",
              color: (task.postponeCount || 0) >= 3 ? "#ef4444" : "#e67700",
              border: `1px solid ${(task.postponeCount || 0) >= 3 ? "#ef444433" : "#f59e0b33"}`,
            }}>
              {(task.postponeCount || 0) >= 3 ? "😤" : "⏰"} {task.postponeCount}번 미룸
            </div>
          )}

          {/* 사진 부족 안내 */}
          {needsMorePhotos(media) && (
            <div className={styles.photoHint}>
              💡 사진을 더 추가하면 알림 효과가 높아져요 (현재 {media?.length || 0}장)
            </div>
          )}

          {/* 행동 버튼 */}
          <div className={styles.actionButtons}>
            {/* 스누즈 */}
            {snoozeCount < 2 && (
              <button className={styles.snoozeButton} onClick={handleSnooze}>
                ⏰ {snoozeCount === 0 ? "5분 뒤" : "3분 뒤"}
              </button>
            )}
            {snoozeCount >= 2 && (
              <button className={styles.snoozeButton} onClick={handleSnooze}>
                📅 미루기
              </button>
            )}

            {/* 확인/출발 */}
            <button
              className={styles.confirmButton}
              style={{
                background: allChecked
                  ? `linear-gradient(135deg, ${categoryInfo.color || "#0891b2"}, ${categoryInfo.color || "#0891b2"}cc)`
                  : `linear-gradient(135deg, #666, #555)`,
                transform: allChecked ? "scale(1.02)" : "scale(1)",
              }}
              onClick={handleConfirm}
            >
              {allChecked && prepItems.length > 0 ? "출발! 🚀" : "확인함"}
            </button>
          </div>

          {/* 3회째 미루기 확인 다이얼로그 */}
          {showSnoozeConfirm && (
            <div className={styles.snoozeDialog}>
              <div className={styles.snoozeDialogContent}>
                <div className={styles.snoozeDialogTitle}>😤 이미 2번 미뤘습니다</div>
                <div className={styles.snoozeDialogText}>
                  정말 미루시겠습니까? 이 할 일은 내일로 이동됩니다.
                </div>
                <div className={styles.snoozeDialogButtons}>
                  <button
                    className={styles.snoozeDialogCancel}
                    onClick={() => setShowSnoozeConfirm(false)}
                  >
                    돌아가기
                  </button>
                  <button
                    className={styles.snoozeDialogConfirm}
                    onClick={handlePostponeConfirm}
                  >
                    내일로 미루기
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
