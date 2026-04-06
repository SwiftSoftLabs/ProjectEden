import React from 'react';
import { useLegacyStore } from '../../store/useLegacyStore';
import { useLuxurySound } from '../../hooks/useLuxurySound';
import { useHaptics } from '../../hooks/useHaptics';
import { useNotifications } from '../../hooks/useNotifications';

export const Overlay: React.FC = () => {
    const { streakCount, streakStatus, incrementStreak, resetStreak } = useLegacyStore();
    const { playChime, playWater } = useLuxurySound();
    const { triggerHaptic } = useHaptics();
    const { permission, requestPermission, scheduleReminder } = useNotifications();

    const handleNurture = () => {
        incrementStreak();
        playWater();
        triggerHaptic('ripple');
    };

    const handleReset = () => {
        resetStreak();
        triggerHaptic('warning');
    };

    const handleHover = () => {
        playChime();
        triggerHaptic('light');
    };

    return (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10 flex flex-col justify-between p-6">
            {/* Header */}
            <header className="flex justify-between items-center">
                <h1 className="text-gold font-serif text-2xl tracking-widest uppercase">Project Eden</h1>
                <div className="bg-void/50 backdrop-blur-md px-4 py-2 rounded-full border border-gold/20">
                    <span className={`text-sm font-sans tracking-wide ${streakStatus === 'at_risk' ? 'text-red-400' : 'text-emerald-500'}`}>
                        Legacy Status: {streakStatus === 'active' ? 'Thriving' : streakStatus === 'at_risk' ? 'At Risk' : 'Fading'}
                    </span>
                </div>
            </header>

            {/* Footer / Controls */}
            <footer className="flex justify-center items-end pb-8 pointer-events-auto gap-4">
                <div className="absolute bottom-6 left-6">
                    <button
                        onClick={() => {
                            if (permission === 'default') {
                                requestPermission();
                            } else {
                                scheduleReminder();
                            }
                        }}
                        className="text-stone-500 hover:text-gold text-xs uppercase tracking-widest transition-colors"
                    >
                        {permission === 'default' ? 'Enable Notifications' : 'Test Reminder'}
                    </button>
                </div>

                <div className="flex flex-col items-center gap-2">
                    <div className="text-gold font-serif text-6xl">{streakCount}</div>
                    <div className="text-white/60 text-xs tracking-[0.2em] uppercase">Days Sustained</div>
                </div>

                {/* Debug Controls for Phase 7 Verification */}
                <div className="absolute bottom-6 right-6 flex flex-col gap-2">
                    <button
                        onClick={handleNurture}
                        onMouseEnter={handleHover}
                        className="bg-gold hover:bg-gold-light text-void px-6 py-3 rounded-full font-serif transition-all duration-500 active:scale-95"
                    >
                        Nurture
                    </button>
                    <button
                        onClick={handleReset}
                        className="bg-red-900/50 hover:bg-red-900 text-white px-4 py-2 rounded-full font-sans text-xs transition-all"
                    >
                        Neglect (Reset)
                    </button>
                </div>
            </footer>
        </div>
    );
};
