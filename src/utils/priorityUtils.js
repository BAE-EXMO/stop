import { PRIORITY_KEYWORDS } from "../constants/priorityKeywords";
import { getDateStr } from "./dateUtils";
import { getPostponeRate } from "./behaviorTracker";

/**
 * task 객체의 우선순위 점수와 이유를 계산
 */
export function calcPriority(task) {
  const titleLower = task.title.toLowerCase();
  let score = 50;
  const reasons = [];

  if (task.time && task.time !== "") {
    const [hour] = task.time.split(":").map(Number);
    score += 30 + (24 - hour);
    reasons.push("⏰ 시간 지정");
  }

  if (PRIORITY_KEYWORDS.business.some((k) => titleLower.includes(k))) {
    score += 25;
    reasons.push("🏛️ 영업시간 제한");
  }
  if (PRIORITY_KEYWORDS.appointment.some((k) => titleLower.includes(k))) {
    score += 20;
    reasons.push("📋 예약/약속");
  }
  if (PRIORITY_KEYWORDS.urgent.some((k) => titleLower.includes(k))) {
    score += 35;
    reasons.push("🔥 긴급");
  }
  if (PRIORITY_KEYWORDS.flexible.some((k) => titleLower.includes(k))) {
    score -= 10;
    reasons.push("🌿 유연");
  }
  if (task.date === getDateStr(0)) {
    score += 15;
    reasons.push("📅 오늘");
  }

  // 시간대 인식: 영업시간 제한 업무의 마감 시간 고려
  const timeBonus = getTimeOfDayBonus(task);
  if (timeBonus.score !== 0) {
    score += timeBonus.score;
    if (timeBonus.reason) reasons.push(timeBonus.reason);
  }

  // 행동 패턴: 자주 미루는 카테고리 가중
  if (task.category) {
    const postponeRate = getPostponeRate(task.category);
    if (postponeRate > 0.5) {
      score += 15;
      reasons.push("🧠 자주 미루는 유형");
    }
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    reasons,
  };
}

/**
 * 현재 시간대에 따른 영업시간 제한 업무의 보너스/페널티
 */
function getTimeOfDayBonus(task) {
  const hour = new Date().getHours();
  const titleLower = task.title.toLowerCase();
  const hasBusinessKeywords = PRIORITY_KEYWORDS.business.some((k) => titleLower.includes(k));

  if (hasBusinessKeywords) {
    if (hour >= 17) return { score: -50, reason: "🏛️ 영업 종료 — 내일 오전 추천" };
    if (hour >= 15) return { score: 20, reason: "🏛️ 곧 영업 종료! 서두르세요" };
    if (hour >= 12) return { score: 10, reason: "🏛️ 오후 — 일찍 가세요" };
  }

  return { score: 0, reason: null };
}

/**
 * 점수를 기반으로 우선순위 라벨 반환
 */
export function getPriorityLabel(score) {
  if (score >= 80) return { text: "지금 바로", color: "#E03131", bg: "#E0313118", icon: "🔴" };
  if (score >= 60) return { text: "오전 중",   color: "#E8590C", bg: "#E8590C18", icon: "🟠" };
  if (score >= 40) return { text: "오후 가능", color: "#E67700", bg: "#E6770018", icon: "🟡" };
  return { text: "여유 있음", color: "#2B8A3E", bg: "#2B8A3E18", icon: "🟢" };
}

/**
 * task의 기한/미루기 상태에 따른 압박 메시지 생성
 */
export function getDeadlineInfo(task) {
  if (!task.deadline) return null;

  const today = getDateStr(0);
  const daysLeft = Math.floor((new Date(task.deadline) - new Date(today)) / 86400000);
  const postponed = task.postponeCount || 0;

  let msg = "";
  let color = "";
  let urgency = 0;

  if (daysLeft < 0) {
    msg = `⛔ 기한 ${Math.abs(daysLeft)}일 초과! 즉시 처리하세요`;
    color = "#E03131";
    urgency = 3;
  } else if (daysLeft === 0) {
    msg = "🔥 오늘이 마감입니다! 더 이상 미룰 수 없습니다";
    color = "#E03131";
    urgency = 3;
  } else if (daysLeft === 1) {
    msg = "⚠️ 내일이 마감입니다. 오늘 반드시 처리하세요";
    color = "#E8590C";
    urgency = 2;
  } else if (daysLeft <= 3) {
    msg = `📅 마감까지 ${daysLeft}일 남았습니다`;
    color = "#E67700";
    urgency = 1;
  } else {
    msg = `📅 마감 ${task.deadline} (${daysLeft}일 남음)`;
    color = "#888";
    urgency = 0;
  }

  if (postponed > 0) {
    const postponeMsg =
      postponed >= 3
        ? `😤 이미 ${postponed}번 미뤘습니다. 그만 미루세요!`
        : postponed >= 2
          ? `😟 ${postponed}번째 미루는 중입니다`
          : `⏰ 1번 미룬 할 일입니다`;
    msg += " · " + postponeMsg;
    if (postponed >= 2) {
      color = "#E03131";
      urgency = Math.max(urgency, 2);
    }
  }

  return { msg, color, urgency, daysLeft, postponed };
}
