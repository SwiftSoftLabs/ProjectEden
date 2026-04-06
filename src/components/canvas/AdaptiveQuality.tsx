import { PerformanceMonitor, AdaptiveDpr, AdaptiveEvents } from '@react-three/drei';
import { usePerformanceStore } from '../../store/usePerformanceStore';
import { useState } from 'react';

export const AdaptiveQuality = () => {
    const { setDpr, setQuality } = usePerformanceStore();
    const [factor, setFactor] = useState(1);

    // Factor 1 = 60fps+
    // Factor 0.5 = <30fps

    const handleIncline = () => {
        setFactor(1);
        setDpr(1.5); // Boost res
        setQuality('high');
    };

    const handleDecline = () => {
        setFactor(0.5);
        setDpr(1); // Lower res
        setQuality('low');
    };

    return (
        <>
            <PerformanceMonitor
                onChange={({ factor }) => setFactor(factor)}
                onIncline={handleIncline}
                onDecline={handleDecline}
                flipflops={3}
                onFallback={handleDecline}
            />
            <AdaptiveDpr pixelated />
            <AdaptiveEvents />
        </>
    );
};
