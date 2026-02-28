import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

export default defineNuxtPlugin((nuxtApp) => {
    const config = useRuntimeConfig();

    const STORAGE_KEY = 'fcm-token';

    const firebaseConfig = {
        apiKey: config.public.firebaseApiKey,
        authDomain: config.public.firebaseAuthDomain,
        projectId: config.public.firebaseProjectId,
        messagingSenderId: config.public.firebaseMessagingSenderId,
        appId: config.public.firebaseAppId,
    };

    const app = initializeApp(firebaseConfig);
    const messagingPromise = isSupported().then((ok) => (ok ? getMessaging(app) : null));

    let initialized = false;
    let isMessageListening = false;

    const showForegroundNotification = (payload) => {
        if (typeof Notification === 'undefined') return;
        if (Notification.permission !== 'granted') return;
        const title = payload?.notification?.title || 'Notification';
        const body = payload?.notification?.body || '';
        const link = payload?.data?.link || payload?.data?.click_action || '/';

        const n = new Notification(title, { body, data: { link } });
        n.onclick = (event) => {
            const url = event.target?.data?.link;
            if (url) window.open(url, '_blank');
            n.close();
        };
    };

    const saveToken = (token) => {
        try {
            if (token) localStorage.setItem(STORAGE_KEY, token);
        } catch (err) {
            console.error('Failed to save FCM token:', err?.message);
        }
    };

    const loadToken = () => {
        try {
            return localStorage.getItem(STORAGE_KEY) || null;
        } catch (err) {
            console.error('Failed to load FCM token:', err?.message);
            return null;
        }
    };

    const clearToken = () => {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (err) {
            console.error('Failed to clear FCM token:', err?.message);
        }
    };

    const requestToken = async () => {
        try {
            const permissions = await Notification.requestPermission();
            if (permissions !== 'granted') {
                console.warn('Notification permission not granted. Cannot get FCM token.');
                return null;
            }


            const messaging = await messagingPromise;
            if (!messaging) {
                console.warn('Firebase Messaging is not supported in this browser.');
                return null;
            }

            const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            const token = await getToken(messaging, { vapidKey: config.public.firebaseVapidKey, serviceWorkerRegistration: reg });

            if (!token) return null;

            console.log('FCM token obtained:', token);
            const prevToken = loadToken();
            if (prevToken !== token) {
                try {
                    await nuxtApp.$api?.('/notifications/push/subscribe', { method: 'POST', body: { token, platform: 'web' } });
                    saveToken(token);
                } catch (err) {
                    console.error('Failed to subscribe to push notifications:', err?.message);
                }
            }
            return token;
        } catch (err) {
            console.error('Error while requesting FCM token:', err?.message);
            return null;
        }
    };

    const listenForeground = async (callback) => {
        if (isMessageListening) return () => { };
        const messaging = await messagingPromise;
        if (!messaging) return () => { };

        isMessageListening = true;
        const unsubscribe = onMessage(messaging, (payload) => {
            console.log('Foreground Message:', payload);
            showForegroundNotification(payload);
            callback?.(payload);
        });

        return () => {
            unsubscribe();
            isMessageListening = false;
        };
    };

    if (process.client && !initialized) {
        initialized = true;
        nuxtApp.hook('app:mounted', async () => {
            const existingToken = localStorage.getItem(STORAGE_KEY);
            if (existingToken) {
                await requestToken();
            }
            await listenForeground();
        });
    }

    return {
        provide: {
            fcm: {
                requestToken,
                listenForeground,
                clearToken: () => localStorage.removeItem(STORAGE_KEY),
            },
        },
    };
});
