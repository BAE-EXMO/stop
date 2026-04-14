/**
 * 반려동물 시스템 — 상수, 헬퍼, 보상 계산
 */

export const PET_TYPES = {
  dog:     { name: "강아지", emoji: "🐕", stages: ["🐶", "🐕", "🦮"], feedEmoji: "🦴" },
  cat:     { name: "고양이", emoji: "🐈", stages: ["🐱", "🐈", "🐈‍⬛"], feedEmoji: "🐟" },
  rabbit:  { name: "토끼",   emoji: "🐇", stages: ["🐰", "🐇", "🐇"], feedEmoji: "🥕" },
  hamster: { name: "햄스터", emoji: "🐹", stages: ["🐹", "🐹", "🐹"], feedEmoji: "🌻" },
  penguin: { name: "펭귄",   emoji: "🐧", stages: ["🐧", "🐧", "🐧"], feedEmoji: "🐟" },
};

export const PET_MOODS = [
  { min: 0,  max: 20,  face: "😢", label: "너무 힘들어요...",    color: "#E03131" },
  { min: 21, max: 40,  face: "😿", label: "배고파요...",         color: "#E8590C" },
  { min: 41, max: 60,  face: "😐", label: "그럭저럭이에요",      color: "#E67700" },
  { min: 61, max: 80,  face: "😊", label: "기분 좋아요!",        color: "#2B8A3E" },
  { min: 81, max: 100, face: "😍", label: "최고로 행복해요!!",   color: "#1C7ED6" },
];

export function getPetMood(hp) {
  return PET_MOODS.find((m) => hp >= m.min && hp <= m.max) || PET_MOODS[2];
}

export function getPetStage(xp) {
  if (xp >= 100) return 2;
  if (xp >= 30) return 1;
  return 0;
}

export const DEFAULT_PET = {
  name: "멈뭉이",
  hp: 65,
  xp: 12,
  completions: 3,
  streak: 1,
};

/**
 * 태스크 완수 시 보상을 계산한다.
 * @param {object} task
 * @param {number} currentStreak
 * @returns {{ gained: number, reason: string }}
 */
export function calcReward(task, currentStreak) {
  const pp = task.postponeCount || 0;
  let gained = 10;
  let reason = "할 일 완수! 수고했어요";

  if (pp >= 3) {
    gained = 25;
    reason = `${pp}번 미뤘지만 결국 해냈어요! 역전승!`;
  } else if (pp === 0) {
    gained = 15;
    reason = "미루지 않고 바로 완수! 보너스!";
  }

  const newStreak = currentStreak + 1;
  if (newStreak >= 5) {
    gained = 30;
    reason = `🔥 ${newStreak}일 연속 완수! 최고!`;
  }

  return { gained, reason };
}

export const POSTPONE_PENALTY = 8;
