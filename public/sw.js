const CACHE_NAME = "stop-app-v1";
const STATIC_ASSETS = ["/", "/index.html"];

// ── Install: 정적 자산 캐시 ──
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: 오래된 캐시 제거 ──
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: 네트워크 우선, 실패 시 캐시 ──
self.addEventListener("fetch", (event) => {
  // API 호출 등은 캐시하지 않음
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 성공 시 캐시 갱신
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ── 메인 앱에서 보낸 알림 메시지 수신 ──
self.addEventListener("message", (event) => {
  const { type, payload } = event.data || {};

  if (type === "SCHEDULE_ALARM") {
    // payload: { id, title, body, triggerAt (timestamp) }
    const delay = Math.max(0, payload.triggerAt - Date.now());

    setTimeout(() => {
      self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: `task-${payload.id}`,
        renotify: true,
        vibrate: [200, 100, 200],
        data: { taskId: payload.id },
        actions: [
          { action: "open", title: "확인하기" },
          { action: "snooze", title: "5분 후" },
        ],
      });
    }, delay);
  }

  if (type === "CANCEL_ALARM") {
    // 해당 태그의 알림 닫기
    self.registration.getNotifications({ tag: `task-${payload.id}` }).then((notifications) => {
      notifications.forEach((n) => n.close());
    });
  }
});

// ── 알림 클릭 ──
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action;
  const taskId = event.notification.data?.taskId;

  if (action === "snooze") {
    // 5분 후 재알림
    setTimeout(() => {
      self.registration.showNotification(event.notification.title, {
        body: event.notification.body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: `task-${taskId}`,
        renotify: true,
        vibrate: [200, 100, 200],
        data: { taskId },
        actions: [
          { action: "open", title: "확인하기" },
          { action: "snooze", title: "5분 후" },
        ],
      });
    }, 5 * 60 * 1000);
    return;
  }

  // 기본: 앱 열기
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.visibilityState === "visible");
      if (existing) {
        existing.focus();
        existing.postMessage({ type: "ALARM_CLICKED", taskId });
      } else {
        self.clients.openWindow("/");
      }
    })
  );
});

// ── Push 이벤트 (향후 서버 푸시 연동용) ──
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "STOP", {
      body: data.body || "할 일을 확인하세요!",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      vibrate: [200, 100, 200],
    })
  );
});
