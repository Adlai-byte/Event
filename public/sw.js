// Service Worker for Web Push Notifications
self.addEventListener('push', function(event) {
  console.log('📬 Push notification received in service worker');
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'New Notification';
  const options = {
    body: data.body || '',
    icon: data.icon || '/assets/icon.png',
    badge: '/assets/icon.png',
    tag: data.tag || 'notification',
    data: data.data || {},
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('👆 Notification clicked:', event);
  event.notification.close();

  // Handle navigation based on notification data
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  } else {
    // Default: focus or open the app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Handle notification close
self.addEventListener('notificationclose', function(event) {
  console.log('❌ Notification closed:', event);
});

