/**
 * 사진 습관화 방지 셔플 알고리즘.
 *
 * - 같은 사진이 2회 연속 표시되지 않음
 * - 7일간 모든 사진이 1회 이상 표시되도록 균등 분배
 * - localStorage "memchwo-photo-history" 에 표시 이력 관리
 */

const HISTORY_KEY = "memchwo-photo-history";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * 표시 이력을 로드한다.
 * @returns {{ lastShown: string|null, history: Array<{ url: string, timestamp: number }> }}
 */
function loadHistory() {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return { lastShown: null, history: [] };
}

function saveHistory(data) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(data));
  } catch { /* storage full */ }
}

/**
 * 미디어 배열에서 습관화 방지 로직에 따라 하나를 선택한다.
 * @param {Array<{ url: string, type: string }>} mediaList
 * @returns {{ url: string, type: string }|null}
 */
export function pickMedia(mediaList) {
  if (!mediaList || mediaList.length === 0) return null;
  if (mediaList.length === 1) return mediaList[0];

  const { lastShown, history } = loadHistory();
  const now = Date.now();

  // 7일 이내 표시 횟수 계산
  const recentHistory = history.filter((h) => now - h.timestamp < SEVEN_DAYS_MS);
  const showCounts = new Map();
  for (const item of mediaList) {
    showCounts.set(item.url, 0);
  }
  for (const h of recentHistory) {
    if (showCounts.has(h.url)) {
      showCounts.set(h.url, showCounts.get(h.url) + 1);
    }
  }

  // 가장 적게 표시된 미디어 후보 선택 (연속 표시 방지)
  const candidates = mediaList.filter((m) => m.url !== lastShown);
  if (candidates.length === 0) {
    // 미디어가 1개뿐이면 그것을 반환
    return mediaList[0];
  }

  // 최소 표시 횟수를 가진 후보들 중 랜덤 선택
  const minCount = Math.min(...candidates.map((c) => showCounts.get(c.url) || 0));
  const leastShown = candidates.filter((c) => (showCounts.get(c.url) || 0) === minCount);
  const picked = leastShown[Math.floor(Math.random() * leastShown.length)];

  // 이력 업데이트
  const updatedHistory = [
    ...recentHistory,
    { url: picked.url, timestamp: now },
  ];
  saveHistory({ lastShown: picked.url, history: updatedHistory });

  return picked;
}

/**
 * 사진이 3장 미만인지 확인한다.
 * @param {Array} mediaList
 * @returns {boolean}
 */
export function needsMorePhotos(mediaList) {
  return !mediaList || mediaList.length < 3;
}
