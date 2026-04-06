import { create } from 'zustand';

interface PerformanceState {
    dpr: number; // Device Pixel Ratio (0.5 to 2.0)
    quality: 'high' | 'low'; // 'high' = full effects, 'low' = minimal effects
    setDpr: (dpr: number) => void;
    setQuality: (quality: 'high' | 'low') => void;
}

export const usePerformanceStore = create<PerformanceState>((set) => ({
    dpr: 1.5, // Default start at reasonable quality
    quality: 'high',
    setDpr: (dpr) => set({ dpr }),
    setQuality: (quality) => set({ quality }),
}));
