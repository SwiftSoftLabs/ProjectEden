import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useLegacyStore } from '../../store/useLegacyStore';
import { easing } from 'maath';
import { Float, Sparkles, Instance, Instances } from '@react-three/drei';
import * as THREE from 'three';

export const GoldenRoots = () => {
    const { streakCount, streakStatus } = useLegacyStore();
    const groupRef = useRef<THREE.Group>(null);

    // Create a procedural "root ball" logic
    // As streakCount increases, the ball gets complex and larger

    // Visualize roots as a collection of floating gold segments
    const rootCount = 50;

    // Memoize random positions for the "roots"
    const rootData = useMemo(() => {
        return new Array(rootCount).fill(0).map(() => ({
            position: [
                (Math.random() - 0.5) * 10,
                (Math.random()) * 5, // Grow upwards
                (Math.random() - 0.5) * 10
            ] as [number, number, number],
            scale: Math.random(),
            rotation: [Math.random() * Math.PI, Math.random() * Math.PI, 0] as [number, number, number]
        }));
    }, []);

    useFrame((state, delta) => {
        if (!groupRef.current) return;

        // Expansion Factor: 
        // 0 streak = small tight ball
        // 10+ streak = large expansive network
        const expansion = Math.max(streakCount * 0.2 + 0.5, 0.8);

        // Animate the group scaling
        easing.damp(groupRef.current.scale, 'x', expansion, 0.5, delta);
        easing.damp(groupRef.current.scale, 'y', expansion, 0.5, delta);
        easing.damp(groupRef.current.scale, 'z', expansion, 0.5, delta);

        // Rotate slowly
        groupRef.current.rotation.y += delta * 0.05;
    });

    const isHealthy = streakStatus === 'active';
    const rootColor = isHealthy ? '#D4AF37' : '#554433';
    const emissiveColor = isHealthy ? '#F4DF87' : '#000000';
    const emissiveIntensity = isHealthy ? 2 : 0;

    return (
        <group position={[0, -0.5, 0]}>
            {/* Sparkles indicate life/energy */}
            {isHealthy && (
                <Sparkles count={streakCount * 5 + 20} scale={5} size={4} speed={0.4} opacity={0.5} color="#F4DF87" />
            )}

            <group ref={groupRef}>
                <Instances range={rootCount}>
                    <cylinderGeometry args={[0.02, 0.02, 1, 8]} />
                    <meshStandardMaterial
                        color={rootColor}
                        emissive={emissiveColor}
                        emissiveIntensity={emissiveIntensity}
                        roughness={0.2}
                        metalness={1}
                    />

                    {rootData.map((data, i) => (
                        <GroupInstance key={i} data={data} streakCount={streakCount} />
                    ))}
                </Instances>
            </group>
        </group>
    );
};

const GroupInstance = ({ data, streakCount }: { data: any, streakCount: number }) => {
    // Individual roots can writhe or move
    return (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <Instance
                position={data.position}
                rotation={data.rotation}
                scale={[
                    1 * (streakCount === 0 ? 3 : 1),
                    data.scale * (streakCount > 0 ? 1 : 0.5),
                    1 * (streakCount === 0 ? 3 : 1)
                ]}
            />
        </Float>
    )
}
