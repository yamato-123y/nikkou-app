self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {}
  event.waitUntil(self.registration.showNotification(data.title || '大和 日報アプリ', {
    body: data.body || '新しいお知らせがあります。', icon: '/nippo.jpg', badge: '/nippo.jpg',
    data: { url: '/' }, tag: 'yamato-notice-' + Date.now(),
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (list) => {
    const url = new URL('/', self.location.origin).href;
    for (const client of list) if (client.url.startsWith(self.location.origin) && 'focus' in client) return client.focus();
    return clients.openWindow(url);
  }));
});
