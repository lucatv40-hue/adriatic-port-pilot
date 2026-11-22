// Worker solo per notifiche push: nessuna cache, nessun controllo delle pagine.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { title: "Rotta Adriatica", body: event.data && event.data.text() }; }
  event.waitUntil(self.registration.showNotification(d.title || "Rotta Adriatica", { body: d.body || "", icon: "/icon.svg", badge: "/icon.svg", data: { url: d.url || "/avvisi" } }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data && event.notification.data.url ? event.notification.data.url : "/"));
});
