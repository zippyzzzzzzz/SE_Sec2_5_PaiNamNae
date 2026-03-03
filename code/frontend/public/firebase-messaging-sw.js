importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: self.NUXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: self.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: self.NUXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    messagingSenderId: self.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: self.NUXT_PUBLIC_FIREBASE_APP_ID || '',
};

const DEFAULT_TARGET = '';

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

self.addEventListener('push', (event) => {
    if (!event.data) return;

    let payload = {};
    try {
        payload = event.data.json();
    } catch (e) {
        console.error('Failed to parse push data', e);
        return;
    }

    const { title, body, link } = payload.data || {};

    if (!title) return;

    const notificationTitle = title;
    const notificationOptions = {
        body: body || '',
        icon: '',
        data: {
            link: link || DEFAULT_TARGET
        },
        requireInteraction: false,
        tag: 'app-notification'
    };

    event.waitUntil(
        self.registration.showNotification(notificationTitle, notificationOptions)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const targetLink = event.notification.data.link || DEFAULT_TARGET;
    const targetUrl = new URL(targetLink, self.location.origin).href;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url === targetUrl || client.url.startsWith(targetUrl)) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});