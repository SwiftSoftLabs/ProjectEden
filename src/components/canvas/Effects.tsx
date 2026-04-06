import { EffectComposer, Bloom, Noise, Vignette, DepthOfField } from '@react-three/postprocessing';
import { useLegacyStore } from '../../store/useLegacyStore';
import { usePerformanceStore } from '../../store/usePerformanceStore';
import { BlendFunction } from 'postprocessing';

export const Effects = () => {
    const { streakStatus } = useLegacyStore();
    const { quality } = usePerformanceStore();

    // Dynamic Effect Parameters based on status
    const isHealthy = streakStatus === 'active';
    const isAtRisk = streakStatus === 'at_risk';

    // Bloom Intensity
    // Healthy: Glows strongly (Divine)
    // At Risk: Dim
    // Broken: Almost none
    const bloomIntensity = isHealthy ? 1.5 : isAtRisk ? 0.5 : 0.1;
    const bloomLuminance = isHealthy ? 0.4 : 0.1;

    // Vignette
    // Heavier vignette when at risk to simulate "tunnel vision" or closing in darkness
    const vignetteDarkness = isHealthy ? 0.5 : 0.8;

    if (quality === 'low') {
        return null; // Disable post-processing entirely on low-end devices
    }

    return (
        <EffectComposer>
            <DepthOfField
                focusDistance={0}
                focalLength={0.02}
                bokehScale={2}
                height={480}
            />
            <Bloom
                luminanceThreshold={bloomLuminance}
                mipmapBlur
                intensity={bloomIntensity}
                radius={0.7}
            />
            <Noise
                premultiply // enables blending with scene
                blendFunction={BlendFunction.OVERLAY}
                opacity={0.05} // Subtle analog film grain
            />
            <Vignette
                eskil={false}
                offset={0.1}
                darkness={vignetteDarkness}
            />
        </EffectComposer>
    );
};
