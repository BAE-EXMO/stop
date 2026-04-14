/**
 * 긴급도 계산 및 Phase 타이밍 결정 유틸리티.
 *
 * 긴급도 레벨:
 *   relaxed (🟢) — 여유 있음
 *   soon    (🟡) — 오후 중
 *   near    (🟠) — 오전 중, 곧
 *   now     (🔴) — 지금 출발해야 함
 *   overdue (⛔) — 기한 초과
 */

/**
 * task 와 현재 시각으로 긴급도 레벨을 반환한다.
 * @param {object} task
 * @returns {"relaxed"|"soon"|"near"|"now"|"overdue"}
 */
export function calcUrgency(task) {
  if (!task.time) return "relaxed";

  const now = new Date();
  const [h, m] = task.time.split(":").map(Number);
  const arrival = new Date();
  arrival.setHours(h, m, 0, 0);

  const travel = (task.travelTime || 0) * 60_000;
  const prep = (task.prepTime || 0) * 60_000;
  const departure = arrival.getTime() - travel - prep;
  const diff = departure - now.getTime(); // ms until departure

  if (diff < -5 * 60_000) return "overdue";  // 출발 5분 초과
  if (diff < 0) return "now";                 // 출발 시각 지남
  if (diff < 5 * 60_000) return "now";        // 5분 이내
  if (diff < 15 * 60_000) return "near";      // 15분 이내
  if (diff < 60 * 60_000) return "soon";      // 1시간 이내
  return "relaxed";
}

/**
 * 긴급도 + 미루기 횟수에 따른 Phase 타이밍을 반환한다.
 * @param {"relaxed"|"soon"|"near"|"now"|"overdue"} urgency
 * @param {number} postponeCount
 * @param {number} skipRate - 사용자의 스킵률 (0~1)
 * @returns {{ phase1: number, phase2: number, phase3: number, particleColor: string, tintRed: boolean, skipSensory: boolean }}
 */
export function getPhaseTimings(urgency, postponeCount = 0, skipRate = 0) {
  // 기본 타이밍 (ms)
  let phase1 = 1000;
  let phase2 = 3000;
  let phase3 = 1000;
  let particleColor = "white";
  let tintRed = false;
  let skipSensory = false;

  // 긴급도에 따른 조정
  switch (urgency) {
    case "near":
      phase1 = 500;
      phase2 = 2500;
      break;
    case "now":
      phase1 = 500;
      phase2 = 2000;
      particleColor = "red";
      break;
    case "overdue":
      phase1 = 0;
      phase2 = 1000;
      phase3 = 500;
      tintRed = true;
      break;
  }

  // 미루기 횟수에 따른 에스컬레이션
  if (postponeCount >= 3) {
    skipSensory = true;
    tintRed = true;
  } else if (postponeCount >= 2) {
    phase2 = Math.max(phase2 - 1000, 1000);
    particleColor = "orange";
  }

  // 스킵률이 70% 이상이면 Phase 2 시간 자동 단축
  if (skipRate > 0.7) {
    phase2 = Math.min(phase2, 2000);
  }

  return { phase1, phase2, phase3, particleColor, tintRed, skipSensory };
}

/** 긴급도별 라벨 */
export const URGENCY_LABELS = {
  relaxed: { emoji: "🟢", text: "여유", color: "#10b981" },
  soon:    { emoji: "🟡", text: "오후",  color: "#eab308" },
  near:    { emoji: "🟠", text: "곧",   color: "#f97316" },
  now:     { emoji: "🔴", text: "지금",  color: "#ef4444" },
  overdue: { emoji: "⛔", text: "초과",  color: "#dc2626" },
};
