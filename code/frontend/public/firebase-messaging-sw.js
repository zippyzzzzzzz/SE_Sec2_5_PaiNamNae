importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-messaging-compat.js')

const firebaseConfig = {
    apiKey: self.NUXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: self.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: self.NUXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    messagingSenderId: self.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: self.NUXT_PUBLIC_FIREBASE_APP_ID || '',
}

firebase.initializeApp(firebaseConfig)
const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Received background message:', payload);

    if (payload.notification) {
        return;
    }

    const title = payload.data?.title || 'Notification';
    const body = payload.data?.body || '';
    const clickAction = payload.data?.click_action;
    const link = payload.data?.link;

    const options = {
        body,
        data: { link: link || clickAction || '/notifications' },
    };

    self.registration.showNotification(title, options);
})

self.addEventListener('notificationclick', (event) => {
    const url = event.notification?.data?.link || '/notifications';
    event.notification.close();

    if (url) {
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
                for (let i = 0; i < clientList.length; i++) {
                    let client = clientList[i];
                    if (client.url === url && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
        );
    }
})
