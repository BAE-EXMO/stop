/**
 * Service Worker 등록 및 알림 스케줄링 유틸리티
 */

let swRegistration = null;

/**
 * SW 등록
 */
export async function registerSW() {
  if (!("serviceWorker" in navigator)) return null;

  try {
    swRegistration = await navigator.serviceWorker.register("/sw.js");
    console.log("[SW] registered:", swRegistration.scope);

    // 알림 권한 요청
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }

    return swRegistration;
  } catch (err) {
    console.warn("[SW] registration failed:", err);
    return null;
  }
}

/**
 * SW에 알림 스케줄 메시지 전송
 */
export function scheduleAlarm({ id, title, body, triggerAt }) {
  if (!swRegistration?.active) return;

  swRegistration.active.postMessage({
    type: "SCHEDULE_ALARM",
    payload: { id, title, body, triggerAt },
  });
}

/**
 * 알림 취소
 */
export function cancelAlarm(id) {
  if (!swRegistration?.active) return;

  swRegistration.active.postMessage({
    type: "CANCEL_ALARM",
    payload: { id },
  });
}

/**
 * SW에서 앱으로 보내는 메시지 리스너 등록
 */
export function onSWMessage(callback) {
  if (!("serviceWorker" in navigator)) return () => {};

  const handler = (event) => callback(event.data);
  navigator.serviceWorker.addEventListener("message", handler);
  return () => navigator.serviceWorker.removeEventListener("message", handler);
}
