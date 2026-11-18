/* 大和日報 - 端末内の未確認通知数（サーバーの保存データには触れません） */
const DB_NAME = 'yamato-push-notices';
const STORE = 'messages';
function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function updateNotices({ add, readId, readAll } = {}) {
  const db = await openDb();
  try {
    const count = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.getAll();
      let pending = 0;
      req.onsuccess = () => {
        const current = req.result || [];
        if (readAll) {
          current.forEach(item => store.delete(item.id));
          pending = 0;
        } else {
          if (readId) store.delete(readId);
          if (add) store.put({ id: add, receivedAt: Date.now() });
          pending = current.filter(item => item.id !== readId).length + (add ? 1 : 0);
        }
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => resolve(pending);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    const badge = self.navigator;
    try {
      if (count > 0 && typeof badge.setAppBadge === 'function') await badge.setAppBadge(count);
      else if (count === 0 && typeof badge.clearAppBadge === 'function') await badge.clearAppBadge();
    } catch (_) { /* 未対応端末でも通知機能は使う */ }
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    windows.forEach(client => client.postMessage({ type: 'yamato-push-unread', count }));
    return count;
  } finally { db.close(); }
}
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {}
  const id = `yamato-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  event.waitUntil((async () => {
    // 保存が失敗してもプッシュ通知自体は表示する
    try { await updateNotices({ add: id }); } catch (e) { console.warn('未確認件数を保存できませんでした', e); }
    await self.registration.showNotification(data.title || '大和 日報アプリ', {
      body: data.body || '新しいお知らせがあります。',
      icon: '/nippo.jpg',
      badge: '/push-badge.png',
      data: { url: '/', noticeId: id },
      tag: id,
    });
  })());
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    try { await updateNotices({ readId: event.notification.data?.noticeId }); } catch (_) {}
    const url = new URL('/', self.location.origin).href;
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin) && 'focus' in client) return client.focus();
    }
    return clients.openWindow(url);
  })());
});
self.addEventListener('message', event => {
  const type = event.data?.type;
  if (type === 'yamato-push-get-unread' || type === 'yamato-push-read-all') {
    const work = updateNotices({ readAll: type === 'yamato-push-read-all' }).catch(() => {});
    if (typeof event.waitUntil === 'function') event.waitUntil(work);
  }
});
