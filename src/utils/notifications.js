/**
 * 브라우저 알림 권한을 요청한다.
 * @returns {Promise<boolean>} 권한 승인 여부
 */
export async function requestNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const result = await Notification.requestPermission();
  return result === "granted";
}

/**
 * 시스템 알림을 보낸다. 페이지가 비활성 상태일 때 사용.
 * @param {string} title
 * @param {string} body
 * @param {Function} onClick - 알림 클릭 시 콜백
 */
export function sendNotification(title, body, onClick) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const notification = new Notification(title, {
    body,
    icon: "🔔",
    tag: "memchwo-alarm",
    renotify: true,
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
    if (onClick) onClick();
  };

  // 10초 후 자동 닫기
  setTimeout(() => notification.close(), 10000);
}
