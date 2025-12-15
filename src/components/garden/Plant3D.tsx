import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Plant3DProps {
  speciesId: string;
  growthStage: number;
  health: number;
  position: [number, number, number];
  isSelected?: boolean;
  onClick?: () => void;
}

// Procedural plant geometry generator
function createPlantGeometry(speciesId: string, growthStage: number) {
  const scale = 0.3 + (growthStage / 30) * 0.7;
  const leafCount = Math.floor(3 + (growthStage / 30) * 8);
  
  return { scale, leafCount };
}

// Get plant color based on species
function getPlantColor(speciesId: string): string {
  const colors: Record<string, string> = {
    'monstera-albo': '#4A7C59',
    'spiritus-sancti': '#2D5A3D',
    'fiddle-leaf': '#3D6B4F',
    'obliqua': '#5A8A6A',
    'pink-princess': '#8B4A6B',
    'musa-aeae': '#6B8E4E',
    'queen-anthurium': '#2E4A3A',
    'titanota': '#7A9A8A',
    'raven-zz': '#1A1A2E',
    'shimpaku-bonsai': '#3A5A4A',
  };
  return colors[speciesId] || '#4A7C59';
}

export function Plant3D({ 
  speciesId, 
  growthStage, 
  health, 
  position, 
  isSelected,
  onClick 
}: Plant3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const leavesRef = useRef<THREE.Group>(null);
  
  const { scale, leafCount } = useMemo(
    () => createPlantGeometry(speciesId, growthStage),
    [speciesId, growthStage]
  );
  
  const plantColor = useMemo(() => getPlantColor(speciesId), [speciesId]);
  
  // Animate plant
  useFrame((state) => {
    if (!groupRef.current || !leavesRef.current) return;
    
    // Gentle swaying animation
    const time = state.clock.elapsedTime;
    leavesRef.current.rotation.z = Math.sin(time * 0.5) * 0.02;
    leavesRef.current.rotation.x = Math.cos(time * 0.3) * 0.01;
    
    // Selection highlight
    if (isSelected) {
      groupRef.current.scale.setScalar(1 + Math.sin(time * 2) * 0.02);
    } else {
      groupRef.current.scale.setScalar(1);
    }
  });
  
  // Health affects color saturation
  const healthyColor = new THREE.Color(plantColor);
  const witherColor = new THREE.Color('#5A4A3A');
  const finalColor = healthyColor.lerp(witherColor, 1 - health);
  
  return (
    <group ref={groupRef} position={position} onClick={onClick}>
      {/* Pot */}
      <mesh position={[0, -0.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.25, 0.2, 0.4, 32]} />
        <meshStandardMaterial 
          color="#2A2A2A" 
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      
      {/* Pot rim */}
      <mesh position={[0, -0.1, 0]} castShadow>
        <torusGeometry args={[0.25, 0.03, 16, 32]} />
        <meshStandardMaterial 
          color="#D4AF37" 
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
      
      {/* Soil */}
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.1, 32]} />
        <meshStandardMaterial 
          color="#3A2A1A" 
          roughness={0.9}
        />
      </mesh>
      
      {/* Plant stem and leaves */}
      <group ref={leavesRef} scale={scale}>
        {/* Main stem */}
        <mesh position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.03, 0.5, 8]} />
          <meshStandardMaterial 
            color={finalColor}
            roughness={0.6}
          />
        </mesh>
        
        {/* Leaves */}
        {Array.from({ length: leafCount }).map((_, i) => {
          const angle = (i / leafCount) * Math.PI * 2;
          const height = 0.2 + (i / leafCount) * 0.4;
          const leafScale = 0.8 + Math.random() * 0.4;
          const droop = (1 - health) * 0.5; // Leaves droop when unhealthy
          
          return (
            <group 
              key={i} 
              position={[0, height, 0]}
              rotation={[droop, angle, 0]}
            >
              <mesh 
                position={[0.15 * leafScale, 0, 0]} 
                rotation={[0, 0, -0.3 - droop]}
                castShadow
              >
                <sphereGeometry args={[0.12 * leafScale, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial 
                  color={finalColor}
                  roughness={0.4}
                  side={THREE.DoubleSide}
                />
              </mesh>
            </group>
          );
        })}
      </group>
      
      {/* Selection glow */}
      {isSelected && (
        <pointLight 
          position={[0, 0.5, 0]} 
          color="#D4AF37" 
          intensity={2} 
          distance={2}
        />
      )}
    </group>
  );
}
