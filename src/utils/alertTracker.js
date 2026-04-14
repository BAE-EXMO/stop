/**
 * 알림 효과 측정 및 학습 데이터 관리.
 *
 * localStorage 키:
 *   memchwo-alert-history  — 개별 알림 기록 배열
 *   memchwo-user-prefs     — 집계된 사용자 선호도
 */

const HISTORY_KEY = "memchwo-alert-history";
const PREFS_KEY = "memchwo-user-prefs";
const MAX_HISTORY = 100; // 최근 100건만 유지

function loadHistory() {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveHistory(data) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(data.slice(-MAX_HISTORY)));
  } catch { /* ignore */ }
}

function loadPrefs() {
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch { return {}; }
}

function savePrefs(data) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

/**
 * 알림 이벤트를 기록한다.
 * @param {object} record
 * @param {number} record.taskId
 * @param {string} [record.photoUsed]
 * @param {string} [record.musicUsed]
 * @param {number} record.phase2Duration - Phase 2 실제 체류 시간 (ms)
 * @param {boolean} record.skipped - "바로 확인하기" 사용 여부
 * @param {boolean} record.snoozed - 스누즈 사용 여부
 * @param {number} record.snoozeCount - 스누즈 횟수
 * @param {boolean} record.checklistCompleted - 체크리스트 전체 완료 여부
 * @param {number} record.timeToAction - 알림 표시 → 행동까지 시간 (ms)
 */
export function recordAlert(record) {
  const history = loadHistory();
  history.push({
    ...record,
    timestamp: new Date().toISOString(),
  });
  saveHistory(history);
  updatePrefs(history);
}

/**
 * 집계 통계를 업데이트한다.
 */
function updatePrefs(history) {
  if (history.length === 0) return;

  const recent = history.slice(-30); // 최근 30건으로 계산
  const skipCount = recent.filter((r) => r.skipped).length;
  const snoozeCount = recent.filter((r) => r.snoozed).length;
  const checklistCount = recent.filter((r) => r.checklistCompleted).length;
  const phase2Stays = recent.filter((r) => !r.skipped && r.phase2Duration > 0);
  const avgPhase2Stay = phase2Stays.length > 0
    ? phase2Stays.reduce((sum, r) => sum + r.phase2Duration, 0) / phase2Stays.length
    : 3000;

  const prefs = {
    avgPhase2Stay: Math.round(avgPhase2Stay),
    skipRate: recent.length > 0 ? skipCount / recent.length : 0,
    snoozeRate: recent.length > 0 ? snoozeCount / recent.length : 0,
    checklistCompletionRate: recent.length > 0 ? checklistCount / recent.length : 0,
    totalAlerts: history.length,
    lastUpdated: new Date().toISOString(),
  };

  savePrefs(prefs);
}

/**
 * 사용자 선호도를 반환한다.
 * @returns {{ avgPhase2Stay: number, skipRate: number, snoozeRate: number, checklistCompletionRate: number, totalAlerts: number }}
 */
export function getUserPrefs() {
  const prefs = loadPrefs();
  return {
    avgPhase2Stay: prefs.avgPhase2Stay || 3000,
    skipRate: prefs.skipRate || 0,
    snoozeRate: prefs.snoozeRate || 0,
    checklistCompletionRate: prefs.checklistCompletionRate || 0,
    totalAlerts: prefs.totalAlerts || 0,
  };
}
