import { create } from 'zustand';

interface LegacyState {
    streakCount: number;
    lastWatered: Date | null;
    // 'active': regular frequency
    // 'at_risk': approaching max_frequency
    // 'broken': exceeded max_frequency, plants wither
    streakStatus: 'active' | 'at_risk' | 'broken';

    incrementStreak: () => void;
    resetStreak: () => void;
    checkStatus: () => void;
}

export const useLegacyStore = create<LegacyState>((set, get) => ({
    streakCount: 0,
    lastWatered: null,
    streakStatus: 'active',

    incrementStreak: () => set((state) => ({
        streakCount: state.streakCount + 1,
        lastWatered: new Date(),
        streakStatus: 'active'
    })),

    resetStreak: () => set({ streakCount: 0, streakStatus: 'broken' }),

    checkStatus: () => {
        // Logic to be refined based on 'Botanical Logic' in PRD
        // For now, toggle based on external calls or time
        const { lastWatered } = get();
        if (!lastWatered) return;

        // Placeholder logic
        const msSinceWatered = new Date().getTime() - lastWatered.getTime();
        const ONE_DAY = 24 * 60 * 60 * 1000;

        if (msSinceWatered > ONE_DAY * 2) {
            set({ streakStatus: 'broken' });
        } else if (msSinceWatered > ONE_DAY * 1.5) {
            set({ streakStatus: 'at_risk' });
        } else {
            set({ streakStatus: 'active' });
        }
    }
}));
