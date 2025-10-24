// In a real app, this would be imported from the Firebase SDK
// For this example, we'll define a placeholder
self.addEventListener('push', function(event) {
  const data = event.data.json();
  const title = data.notification.title;
  const options = {
    body: data.notification.body,
    icon: '/icon-192x192.png'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
