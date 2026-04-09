/**
 * 오늘 기준 offset일 후의 날짜 문자열 (YYYY-MM-DD)
 */
export function getDateStr(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * 날짜 문자열을 사용자 친화적 라벨로 변환
 */
export function getDateLabel(dateStr) {
  const today = getDateStr(0);
  const tomorrow = getDateStr(1);

  if (dateStr === today) return "오늘";
  if (dateStr === tomorrow) return "내일";

  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()} (${WEEKDAYS[date.getDay()]})`;
}

/**
 * 분 단위 시간을 "X시간 Y분" 형식으로 포맷
 */
export function formatTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours > 0) {
    return `${hours}시간${remainder > 0 ? " " + remainder + "분" : ""}`;
  }
  return `${minutes}분`;
}

/**
 * "HH:MM" 시각에서 minutes분을 뺀 시각 문자열 반환
 */
export function subtractMinutes(timeStr, minutes) {
  const [hours, mins] = timeStr.split(":").map(Number);
  let totalMinutes = hours * 60 + mins - minutes;
  if (totalMinutes < 0) totalMinutes += 1440;
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const m = String(totalMinutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}
