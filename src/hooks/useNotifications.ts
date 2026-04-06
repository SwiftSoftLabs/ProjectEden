import { useState, useCallback } from 'react';

export const useNotifications = () => {
    const [permission, setPermission] = useState<NotificationPermission>(
        typeof Notification !== 'undefined' ? Notification.permission : 'default'
    );

    const requestPermission = useCallback(async () => {
        if (typeof Notification === 'undefined') return;

        const result = await Notification.requestPermission();
        setPermission(result);

        if (result === 'granted') {
            new Notification('Connected to Eden', {
                body: 'The garden acknowledges your presence.',
                icon: '/pwa-192x192.png', // Placeholder
                silent: true
            });
        }
    }, []);

    const scheduleReminder = useCallback((message: string = "Your garden awaits.") => {
        if (permission !== 'granted') return;

        // In a real PWA context with a backend specific for push (like VAPID), 
        // we would subscribe the user here.
        // For this frontend-only demo, we simulate a delayed notification.

        console.log(`[Project Eden] Scheduled Notification: ${message}`);

        setTimeout(() => {
            new Notification('Project Eden', {
                body: message,
                icon: '/pwa-192x192.png'
            });
        }, 5000); // 5 second demo delay
    }, [permission]);

    const addNotification = useCallback((notification: { id: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error', timestamp: Date }) => {
        // In a real app, this would add to a global notification store for UI toasts
        console.log(`[Project Eden] Notification: ${notification.title} - ${notification.message}`);

        if (permission === 'granted') {
            new Notification(notification.title, {
                body: notification.message,
                icon: '/pwa-192x192.png',
                silent: true
            });
        }
    }, [permission]);

    return {
        permission,
        requestPermission,
        scheduleReminder,
        addNotification
    };
};
