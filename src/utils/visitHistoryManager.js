import { getDateStr } from "./dateUtils";

/**
 * 할 일 완료 시 방문 이력을 업데이트한다.
 * @param {Array} history - 현재 방문 이력 배열
 * @param {string} placeName - 방문한 장소 이름
 * @param {Object} taskInfo - { location, category, travelTime }
 * @returns {Array} 업데이트된 방문 이력 배열
 */
export function recordVisit(history, placeName, taskInfo = {}) {
  const existing = history.find(
    (h) => h.name === placeName || h.name === taskInfo.location
  );

  if (existing) {
    return history.map((h) => {
      if (h !== existing) return h;
      return {
        ...h,
        visits: h.visits + 1,
        lastVisit: getDateStr(0),
      };
    });
  }

  // 새로운 장소 추가
  return [
    ...history,
    {
      name: placeName || taskInfo.location || "알 수 없음",
      address: "",
      dist: "",
      travelTime: taskInfo.travelTime || 0,
      keywords: [],
      visits: 1,
      lastVisit: getDateStr(0),
      category: taskInfo.category || "errand",
      prep: [],
    },
  ];
}
