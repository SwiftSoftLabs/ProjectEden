import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useLegacyStore } from '../../store/useLegacyStore';
import { easing } from 'maath';
import * as THREE from 'three';

export const LightingController = () => {
    const { streakStatus } = useLegacyStore();
    const ambientRef = useRef<THREE.AmbientLight>(null);
    const sunRef = useRef<THREE.DirectionalLight>(null);

    useFrame((state, delta) => {
        // Target Colors
        // Active: Gold/Warm
        // At Risk/Broken: Twilight/Blue/Cold
        const isHealthy = streakStatus === 'active';

        const targetAmbient = isHealthy ? '#443300' : '#001133';
        const targetSun = isHealthy ? '#D4AF37' : '#203050';
        const targetIntensity = isHealthy ? 2 : 0.5;

        // Smooth transition
        if (ambientRef.current) {
            easing.dampC(ambientRef.current.color, targetAmbient, 0.5, delta);
        }

        if (sunRef.current) {
            easing.dampC(sunRef.current.color, targetSun, 0.5, delta);
            easing.damp(sunRef.current, 'intensity', targetIntensity, 0.5, delta);

            // Move sun position slightly for dramatic shadow shift
            const sunX = isHealthy ? 5 : -5;
            easing.damp(sunRef.current.position, 'x', sunX, 1, delta);
        }

    });

    return (
        <>
            <ambientLight ref={ambientRef} intensity={0.5} />
            <directionalLight
                ref={sunRef}
                position={[5, 5, 5]}
                castShadow
                shadow-mapSize={[2048, 2048]}
            />
            {/* Rim light for drama */}
            <spotLight position={[-5, 5, -5]} intensity={5} color="#004030" angle={0.5} penumbra={1} />
        </>
    );
};
