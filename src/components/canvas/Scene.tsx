import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls, Grid } from '@react-three/drei';
import { Suspense } from 'react';
import { LightingController } from './LightingController';
import { GoldenRoots } from './GoldenRoots';
import { Effects } from './Effects';
import { AdaptiveQuality } from './AdaptiveQuality';

export const Scene: React.FC = () => {
    return (
        <div className="absolute top-0 left-0 w-full h-full bg-void -z-10">
            <Canvas shadows camera={{ position: [0, 2, 5], fov: 45 }}>
                <Suspense fallback={null}>
                    <AdaptiveQuality />
                    {/* Phase 7: Dynamic Lighting & Roots */}
                    <LightingController />
                    <GoldenRoots />

                    {/* Phase 8: Post-Processing */}
                    <Effects />

                    {/* Placeholder Plane for the "Ground" */}
                    <Grid infiniteGrid fadeDistance={30} sectionColor="#443300" cellColor="#221100" />

                    {/* Debug Cube to confirm Render */}
                    <mesh position={[2, 0, 0]}>
                        <boxGeometry args={[0.5, 0.5, 0.5]} />
                        <meshStandardMaterial color="red" emissive="red" emissiveIntensity={0.5} />
                    </mesh>

                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.01, 0]} receiveShadow>
                        <planeGeometry args={[50, 50]} />
                        <meshStandardMaterial color="#050505" roughness={0.8} metalness={0.2} />
                    </mesh>

                    <OrbitControls
                        enablePan={false}
                        minPolarAngle={Math.PI / 4}
                        maxPolarAngle={Math.PI / 2}
                    />
                    <Environment preset="city" />
                </Suspense>
            </Canvas>
        </div>
    );
};
