/**
 * 사용자가 다른 작업 중이어도 앱 화면을 강제로 전면에 띄운다.
 *
 * 1. window.focus() — 탭 포커스
 * 2. Fullscreen API — 전체 화면 전환
 * 3. Wake Lock API — 화면 꺼짐 방지
 */

let wakeLock = null;

/**
 * 앱을 전면으로 가져오고 전체 화면으로 전환
 */
export async function takeoverScreen() {
  // 1) 탭 포커스
  try {
    window.focus();
  } catch { /* ignore */ }

  // 2) 전체 화면 요청
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      await (el.requestFullscreen?.() || el.webkitRequestFullscreen?.() || el.msRequestFullscreen?.());
    }
  } catch { /* 사용자 제스처 필요 시 실패 — 무시 */ }

  // 3) 화면 꺼짐 방지 (Wake Lock)
  try {
    if ("wakeLock" in navigator) {
      wakeLock = await navigator.wakeLock.request("screen");
    }
  } catch { /* ignore */ }
}

/**
 * 전체 화면 해제 + Wake Lock 해제
 */
export async function releaseScreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  } catch { /* ignore */ }

  try {
    if (wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch { /* ignore */ }
}
