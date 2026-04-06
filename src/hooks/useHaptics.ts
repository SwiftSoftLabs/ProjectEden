import { useCallback } from 'react';

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'ripple';

export const useHaptics = () => {
    const triggerHaptic = useCallback((pattern: HapticPattern) => {
        if (!navigator.vibrate) return;

        switch (pattern) {
            case 'light':
                navigator.vibrate(10);
                break;
            case 'medium':
                navigator.vibrate(40);
                break;
            case 'heavy':
                navigator.vibrate(70);
                break;
            case 'success':
                navigator.vibrate([10, 30, 50]);
                break;
            case 'warning':
                navigator.vibrate([50, 30, 50, 30, 50]);
                break;
            case 'ripple':
                // Simulating water droplets
                navigator.vibrate([5, 50, 5, 50, 5]);
                break;
        }
    }, []);

    return { triggerHaptic };
};
