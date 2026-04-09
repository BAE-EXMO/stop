import { SMART_DB } from "../data/visitHistory";

/**
 * 할 일 제목에서 키워드를 분석하여 스마트 추천 매칭
 */
export function findSmartMatch(title) {
  const lower = title.toLowerCase().trim();
  if (!lower) return null;

  for (const entry of SMART_DB) {
    for (const keyword of entry.keywords) {
      if (lower.includes(keyword)) return entry;
    }
  }
  return null;
}

/**
 * 방문 이력에서 제목과 매칭되는 장소를 방문 횟수 순으로 반환
 */
export function findHistoryMatches(title, history) {
  const lower = title.toLowerCase().trim();
  if (!lower) return [];

  return history
    .filter(
      (place) =>
        place.keywords.some((k) => lower.includes(k)) ||
        place.name.toLowerCase().includes(lower)
    )
    .sort((a, b) => b.visits - a.visits);
}
