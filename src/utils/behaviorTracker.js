const BEHAVIOR_STORAGE_KEY = "memchwo-behavior";

/**
 * 행동 패턴 데이터를 로드한다.
 * 구조: { [category]: { completed: number, postponed: number } }
 */
function loadBehavior() {
  try {
    const stored = localStorage.getItem(BEHAVIOR_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveBehavior(data) {
  try {
    localStorage.setItem(BEHAVIOR_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage full — ignore
  }
}

/**
 * task 완료/미루기 행동을 기록한다.
 * @param {string} category - task 카테고리 (work, health, errand 등)
 * @param {"completed"|"postponed"} action
 */
export function recordTaskAction(category, action) {
  const data = loadBehavior();
  if (!data[category]) {
    data[category] = { completed: 0, postponed: 0 };
  }
  data[category][action] = (data[category][action] || 0) + 1;
  saveBehavior(data);
}

/**
 * 특정 카테고리의 미루기 비율을 반환한다. (0 ~ 1)
 * 데이터가 없으면 0을 반환.
 * @param {string} category
 * @returns {number}
 */
export function getPostponeRate(category) {
  const data = loadBehavior();
  const entry = data[category];
  if (!entry) return 0;

  const total = (entry.completed || 0) + (entry.postponed || 0);
  if (total === 0) return 0;

  return (entry.postponed || 0) / total;
}
