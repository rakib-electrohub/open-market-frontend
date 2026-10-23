self.addEventListener("push", (event) => {
  if (!event.data) return;
  const payload = event.data.json();
  const title = payload.title || "Open Market order alert";
  event.waitUntil(self.registration.showNotification(title, {
    body: payload.body || "A new order needs your attention.",
    tag: payload.order_id ? `order-${payload.order_id}` : undefined,
    data: { url: payload.url || "/" },
    requireInteraction: true,
    silent: false,
    vibrate: [200, 100, 200],
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin) && "focus" in client) {
        await client.navigate(target);
        return client.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});
