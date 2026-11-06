// Service worker do gerenciador: recebe e mostra os avisos de parcelas.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "L&F Brasa e Chapa", {
    body: d.body || "Você tem parcelas para conferir.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "parcelas",
    renotify: true,
    data: { url: d.url || "/?aba=compras" }
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const alvo = new URL((e.notification.data && e.notification.data.url) || "/?aba=compras", self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(lista => {
    for (const c of lista) {
      const u = new URL(c.url);
      if (u.origin === self.location.origin && !u.pathname.startsWith("/link")) {
        return c.focus().then(w => (w && w.navigate) ? w.navigate(alvo) : null);
      }
    }
    return self.clients.openWindow(alvo);
  }));
});
