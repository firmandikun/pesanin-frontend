// Pesanin Web Push: shows new-order notifications even when the app tab is closed.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: "Pesanin", body: event.data?.text() }; }
  event.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    // The open app already shows its own toast; tell it to refresh instead of doubling up.
    tabs.forEach((c) => c.postMessage({ type: "pesanin:notification", data }));
    if (tabs.some((c) => c.visibilityState === "visible" && c.focused)) return;
    await self.registration.showNotification(data.title || "Pesanin", {
      body: data.body || "", tag: data.tag || undefined, renotify: true,
      icon: "/pesanin-logo.png", data: { url: data.url || "/orders" },
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/orders", self.location.origin).href;
  event.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const tab = tabs.find((c) => c.url.startsWith(self.location.origin));
    if (tab) { await tab.focus(); return tab.navigate(url); }
    return self.clients.openWindow(url);
  })());
});
