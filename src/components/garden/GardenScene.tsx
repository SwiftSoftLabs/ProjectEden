import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useGardenStore, Plant } from '@/store/gardenStore';

// Custom shaders for advanced plant rendering
const subsurfaceScatteringVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  
  uniform float time;
  uniform float growthProgress;
  uniform float unfurlAmount;
  uniform float droopAmount;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    
    vec3 pos = position;
    
    // Leaf unfurling animation - curl from center outward
    float unfurlFactor = smoothstep(0.0, 1.0, unfurlAmount);
    float distFromCenter = length(pos.xz);
    float curlAmount = (1.0 - unfurlFactor) * distFromCenter * 2.0;
    pos.y += curlAmount * 0.3;
    pos.xz *= mix(0.3, 1.0, unfurlFactor);
    
    // Droop effect based on health
    float droopFactor = droopAmount * distFromCenter;
    pos.y -= droopFactor * 0.5;
    
    // Gentle wind sway
    float sway = sin(time * 2.0 + pos.y * 3.0) * 0.02 * growthProgress;
    pos.x += sway;
    pos.z += sway * 0.5;
    
    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPosition.xyz;
    vViewPosition = (modelViewMatrix * vec4(pos, 1.0)).xyz;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const subsurfaceScatteringFragmentShader = `
  uniform vec3 baseColor;
  uniform vec3 subsurfaceColor;
  uniform float subsurfaceIntensity;
  uniform float roughness;
  uniform float health;
  uniform vec3 lightPosition;
  uniform float time;
  
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(-vViewPosition);
    vec3 lightDir = normalize(lightPosition - vWorldPosition);
    
    // Basic diffuse lighting
    float NdotL = max(dot(normal, lightDir), 0.0);
    
    // Subsurface scattering approximation
    float backLight = max(dot(-normal, lightDir), 0.0);
    float sss = pow(backLight, 2.0) * subsurfaceIntensity;
    
    // Fresnel rim lighting
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
    
    // Wither effect - desaturation based on health
    vec3 healthyColor = baseColor;
    vec3 witheredColor = vec3(0.35, 0.29, 0.23); // Brown/gray
    vec3 finalBaseColor = mix(witheredColor, healthyColor, health);
    
    // Combine lighting
    vec3 diffuse = finalBaseColor * (NdotL * 0.7 + 0.3);
    vec3 subsurface = subsurfaceColor * sss * health;
    vec3 rim = vec3(0.2) * fresnel * 0.3;
    
    vec3 finalColor = diffuse + subsurface + rim;
    
    // Add subtle color variation
    float variation = sin(vUv.x * 20.0 + vUv.y * 15.0 + time * 0.5) * 0.05;
    finalColor += variation * health;
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

const witherVertexShader = `
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec3 vPosition;
  
  uniform float droopAmount;
  uniform float time;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    
    vec3 pos = position;
    
    // Droop effect
    float distFromCenter = length(pos.xz);
    pos.y -= droopAmount * distFromCenter * 0.8;
    
    // Curl inward when withering
    float curlFactor = droopAmount * 0.5;
    pos.xz *= 1.0 - curlFactor * distFromCenter;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const witherFragmentShader = `
  uniform vec3 baseColor;
  uniform float health;
  uniform float time;
  
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec3 vPosition;
  
  void main() {
    vec3 normal = normalize(vNormal);
    
    // Desaturation based on health
    vec3 healthyColor = baseColor;
    vec3 witheredColor = vec3(0.4, 0.35, 0.25);
    vec3 deadColor = vec3(0.25, 0.2, 0.15);
    
    vec3 color = mix(deadColor, healthyColor, health);
    
    // Add brown spots when unhealthy
    float spots = smoothstep(0.4, 0.6, sin(vUv.x * 30.0) * sin(vUv.y * 30.0));
    color = mix(color, witheredColor * 0.7, spots * (1.0 - health) * 0.5);
    
    // Basic lighting
    float light = dot(normal, normalize(vec3(1.0, 1.0, 1.0))) * 0.5 + 0.5;
    
    gl_FragColor = vec4(color * light, 1.0);
  }
`;

// Plant species configurations with unique characteristics
interface PlantSpeciesConfig {
  stemHeight: number;
  stemRadius: number;
  leafShape: 'monstera' | 'fiddle' | 'palm' | 'succulent' | 'bonsai';
  leafSize: number;
  leafCount: number;
  baseColor: THREE.Color;
  subsurfaceColor: THREE.Color;
  hasVariegation: boolean;
  variegationColor?: THREE.Color;
}

const PLANT_CONFIGS: Record<string, PlantSpeciesConfig> = {
  'monstera-albo': {
    stemHeight: 0.6,
    stemRadius: 0.03,
    leafShape: 'monstera',
    leafSize: 0.25,
    leafCount: 6,
    baseColor: new THREE.Color('#4A7C59'),
    subsurfaceColor: new THREE.Color('#8FBC8F'),
    hasVariegation: true,
    variegationColor: new THREE.Color('#F5F5DC'),
  },
  'spiritus-sancti': {
    stemHeight: 0.7,
    stemRadius: 0.025,
    leafShape: 'palm',
    leafSize: 0.35,
    leafCount: 4,
    baseColor: new THREE.Color('#2D5A3D'),
    subsurfaceColor: new THREE.Color('#6B8E6B'),
    hasVariegation: false,
  },
  'fiddle-leaf': {
    stemHeight: 0.8,
    stemRadius: 0.04,
    leafShape: 'fiddle',
    leafSize: 0.3,
    leafCount: 8,
    baseColor: new THREE.Color('#3D6B4F'),
    subsurfaceColor: new THREE.Color('#7CB07C'),
    hasVariegation: false,
  },
  'obliqua': {
    stemHeight: 0.4,
    stemRadius: 0.02,
    leafShape: 'monstera',
    leafSize: 0.2,
    leafCount: 5,
    baseColor: new THREE.Color('#5A8A6A'),
    subsurfaceColor: new THREE.Color('#90C090'),
    hasVariegation: false,
  },
  'pink-princess': {
    stemHeight: 0.5,
    stemRadius: 0.03,
    leafShape: 'fiddle',
    leafSize: 0.22,
    leafCount: 6,
    baseColor: new THREE.Color('#2A3A2A'),
    subsurfaceColor: new THREE.Color('#8B4A6B'),
    hasVariegation: true,
    variegationColor: new THREE.Color('#FFB6C1'),
  },
  'musa-aeae': {
    stemHeight: 0.9,
    stemRadius: 0.05,
    leafShape: 'palm',
    leafSize: 0.4,
    leafCount: 5,
    baseColor: new THREE.Color('#6B8E4E'),
    subsurfaceColor: new THREE.Color('#98D098'),
    hasVariegation: true,
    variegationColor: new THREE.Color('#FFFACD'),
  },
  'queen-anthurium': {
    stemHeight: 0.5,
    stemRadius: 0.025,
    leafShape: 'fiddle',
    leafSize: 0.28,
    leafCount: 5,
    baseColor: new THREE.Color('#2E4A3A'),
    subsurfaceColor: new THREE.Color('#5A7A5A'),
    hasVariegation: false,
  },
  'titanota': {
    stemHeight: 0.2,
    stemRadius: 0.06,
    leafShape: 'succulent',
    leafSize: 0.2,
    leafCount: 12,
    baseColor: new THREE.Color('#7A9A8A'),
    subsurfaceColor: new THREE.Color('#A0C0B0'),
    hasVariegation: false,
  },
  'raven-zz': {
    stemHeight: 0.6,
    stemRadius: 0.02,
    leafShape: 'palm',
    leafSize: 0.15,
    leafCount: 10,
    baseColor: new THREE.Color('#1A1A2E'),
    subsurfaceColor: new THREE.Color('#2A2A4E'),
    hasVariegation: false,
  },
  'shimpaku-bonsai': {
    stemHeight: 0.4,
    stemRadius: 0.04,
    leafShape: 'bonsai',
    leafSize: 0.08,
    leafCount: 30,
    baseColor: new THREE.Color('#3A5A4A'),
    subsurfaceColor: new THREE.Color('#5A8A6A'),
    hasVariegation: false,
  },
};

// Growth keyframes for morph targets (5 stages per plant)
interface GrowthKeyframe {
  scale: number;
  leafCount: number;
  stemHeight: number;
  leafSize: number;
  unfurlAmount: number;
}

const GROWTH_KEYFRAMES: GrowthKeyframe[] = [
  { scale: 0.2, leafCount: 1, stemHeight: 0.15, leafSize: 0.3, unfurlAmount: 0.1 },  // Stage 0-6: Seedling
  { scale: 0.35, leafCount: 2, stemHeight: 0.25, leafSize: 0.45, unfurlAmount: 0.3 }, // Stage 6-12: Young
  { scale: 0.5, leafCount: 4, stemHeight: 0.4, leafSize: 0.6, unfurlAmount: 0.5 },   // Stage 12-18: Adolescent
  { scale: 0.7, leafCount: 6, stemHeight: 0.6, leafSize: 0.75, unfurlAmount: 0.7 },  // Stage 18-24: Mature
  { scale: 0.85, leafCount: 8, stemHeight: 0.8, leafSize: 0.9, unfurlAmount: 0.85 }, // Stage 24-30: Full grown
  { scale: 1.0, leafCount: 10, stemHeight: 1.0, leafSize: 1.0, unfurlAmount: 1.0 },  // Stage 30: Maximum
];

// Imperative Three.js scene to avoid Tempo annotation conflicts
class GardenSceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private plants: Map<string, THREE.Group> = new Map();
  private plantMaterials: Map<string, THREE.ShaderMaterial[]> = new Map();
  private plantData: Map<string, { speciesId: string; growthStage: number; health: number }> = new Map();
  private floor: THREE.Mesh | null = null;
  private roots: THREE.Group | null = null;
  private rootMaterials: THREE.MeshStandardMaterial[] = [];
  private directionalLight: THREE.DirectionalLight | null = null;
  private animationId: number | null = null;
  private targetCameraPosition = new THREE.Vector3(0, 2, 8);
  private currentCameraPosition = new THREE.Vector3(0, 2, 8);
  private targetLookAt = new THREE.Vector3(0, 0, 0);
  private currentLookAt = new THREE.Vector3(0, 0, 0);
  private onPlantClick: ((id: string) => void) | null = null;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private plantIdMap: Map<THREE.Object3D, string> = new Map();
  private clock = new THREE.Clock();
  
  // Horizontal scroll with inertia
  private scrollPosition = 0;
  private scrollVelocity = 0;
  private targetScrollPosition = 0;
  private isDragging = false;
  private lastMouseX = 0;
  private scrollFriction = 0.92; // Heavy inertia
  private scrollSensitivity = 0.008;
  
  // Parallax background
  private backgroundGroup: THREE.Group | null = null;
  private parallaxFactor = 0.1; // 10% speed
  
  // Depth of field simulation
  private focusDistance = 8;
  private dofStrength = 0;
  private targetDofStrength = 0;
  
  // Camera dolly animation
  private cameraAnimationProgress = 1;
  private cameraAnimationDuration = 1.5;
  private cameraStartPosition = new THREE.Vector3();
  private cameraEndPosition = new THREE.Vector3();
  private cameraStartLookAt = new THREE.Vector3();
  private cameraEndLookAt = new THREE.Vector3();

  constructor(container: HTMLElement) {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#050505');
    this.scene.fog = new THREE.FogExp2(0x050505, 0.03);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 2, 8);

    // Renderer with enhanced settings
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    // Enhanced Lighting for PBR
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    // Main directional light (sun)
    this.directionalLight = new THREE.DirectionalLight(0xffd700, 1.5);
    this.directionalLight.position.set(5, 10, 5);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 50;
    this.directionalLight.shadow.bias = -0.0001;
    this.scene.add(this.directionalLight);

    // Fill light
    const fillLight = new THREE.DirectionalLight(0x87ceeb, 0.3);
    fillLight.position.set(-5, 5, -5);
    this.scene.add(fillLight);

    // Rim light for plant highlights
    const rimLight = new THREE.PointLight(0xd4af37, 0.8);
    rimLight.position.set(-3, 3, 3);
    this.scene.add(rimLight);

    // Back light for subsurface scattering effect
    const backLight = new THREE.PointLight(0x90ee90, 0.5);
    backLight.position.set(0, 2, -5);
    this.scene.add(backLight);

    // Floor with marble-like material
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: '#0A0A0A',
      roughness: 0.85,
      metalness: 0.15,
    });
    this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -0.5;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);

    // Stars with varying sizes
    const starsGeometry = new THREE.BufferGeometry();
    const starsPositions = new Float32Array(1500);
    const starsSizes = new Float32Array(500);
    for (let i = 0; i < 1500; i++) {
      starsPositions[i] = (Math.random() - 0.5) * 100;
    }
    for (let i = 0; i < 500; i++) {
      starsSizes[i] = Math.random() * 0.15 + 0.05;
    }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));
    const starsMaterial = new THREE.PointsMaterial({
      size: 0.1,
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(stars);

    // Parallax background - greenhouse architecture
    this.createParallaxBackground();

    // Roots group
    this.roots = new THREE.Group();
    this.scene.add(this.roots);

    // Event listeners
    this.renderer.domElement.addEventListener('click', this.handleClick.bind(this));
    this.renderer.domElement.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.renderer.domElement.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.renderer.domElement.addEventListener('mouseleave', this.handleMouseUp.bind(this));
    this.renderer.domElement.addEventListener('wheel', this.handleWheel.bind(this));
    this.renderer.domElement.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.renderer.domElement.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.renderer.domElement.addEventListener('touchend', this.handleTouchEnd.bind(this));
    window.addEventListener('resize', this.handleResize.bind(this));

    // Start animation
    this.animate();
  }

  // Create parallax greenhouse background
  private createParallaxBackground() {
    this.backgroundGroup = new THREE.Group();
    this.backgroundGroup.position.z = -20;
    
    // Greenhouse beams
    const beamMaterial = new THREE.MeshStandardMaterial({
      color: '#1A1A1A',
      roughness: 0.3,
      metalness: 0.8,
      transparent: true,
      opacity: 0.4,
    });
    
    // Vertical beams
    for (let i = -5; i <= 5; i++) {
      const beamGeometry = new THREE.BoxGeometry(0.1, 15, 0.1);
      const beam = new THREE.Mesh(beamGeometry, beamMaterial);
      beam.position.set(i * 8, 5, 0);
      this.backgroundGroup.add(beam);
    }
    
    // Horizontal beams
    for (let j = 0; j < 4; j++) {
      const crossBeamGeometry = new THREE.BoxGeometry(80, 0.08, 0.08);
      const crossBeam = new THREE.Mesh(crossBeamGeometry, beamMaterial);
      crossBeam.position.set(0, j * 4, 0);
      this.backgroundGroup.add(crossBeam);
    }
    
    // Arched roof beams
    const archMaterial = new THREE.MeshStandardMaterial({
      color: '#2A2A2A',
      roughness: 0.4,
      metalness: 0.6,
      transparent: true,
      opacity: 0.3,
    });
    
    for (let i = -4; i <= 4; i++) {
      const archCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(i * 10 - 4, 8, 0),
        new THREE.Vector3(i * 10, 12, 0),
        new THREE.Vector3(i * 10 + 4, 8, 0),
      ]);
      const archGeometry = new THREE.TubeGeometry(archCurve, 20, 0.05, 8, false);
      const arch = new THREE.Mesh(archGeometry, archMaterial);
      this.backgroundGroup.add(arch);
    }
    
    // Glass panels (subtle)
    const glassMaterial = new THREE.MeshStandardMaterial({
      color: '#87CEEB',
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.05,
    });
    
    const glassGeometry = new THREE.PlaneGeometry(80, 15);
    const glass = new THREE.Mesh(glassGeometry, glassMaterial);
    glass.position.z = -2;
    this.backgroundGroup.add(glass);
    
    this.scene.add(this.backgroundGroup);
  }

  // Horizontal scroll handlers
  private handleMouseDown(event: MouseEvent) {
    this.isDragging = true;
    this.lastMouseX = event.clientX;
    this.scrollVelocity = 0;
  }

  private handleMouseMove(event: MouseEvent) {
    if (!this.isDragging) return;
    
    const deltaX = event.clientX - this.lastMouseX;
    this.scrollVelocity = -deltaX * this.scrollSensitivity;
    this.targetScrollPosition += this.scrollVelocity;
    this.lastMouseX = event.clientX;
  }

  private handleMouseUp() {
    this.isDragging = false;
  }

  private handleWheel(event: WheelEvent) {
    event.preventDefault();
    this.scrollVelocity += event.deltaX * 0.002 + event.deltaY * 0.002;
    this.targetScrollPosition += this.scrollVelocity;
  }

  private handleTouchStart(event: TouchEvent) {
    if (event.touches.length === 1) {
      this.isDragging = true;
      this.lastMouseX = event.touches[0].clientX;
      this.scrollVelocity = 0;
    }
  }

  private handleTouchMove(event: TouchEvent) {
    if (!this.isDragging || event.touches.length !== 1) return;
    
    const deltaX = event.touches[0].clientX - this.lastMouseX;
    this.scrollVelocity = -deltaX * this.scrollSensitivity * 2;
    this.targetScrollPosition += this.scrollVelocity;
    this.lastMouseX = event.touches[0].clientX;
  }

  private handleTouchEnd() {
    this.isDragging = false;
  }

  private handleClick(event: MouseEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    for (const intersect of intersects) {
      let obj: THREE.Object3D | null = intersect.object;
      while (obj) {
        const plantId = this.plantIdMap.get(obj);
        if (plantId && this.onPlantClick) {
          this.onPlantClick(plantId);
          return;
        }
        obj = obj.parent;
      }
    }
  }

  private handleResize() {
    const container = this.renderer.domElement.parentElement;
    if (!container) return;

    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  setOnPlantClick(callback: (id: string) => void) {
    this.onPlantClick = callback;
  }

  // Interpolate between growth keyframes for smooth 30-stage morph targets
  private getGrowthState(growthStage: number): GrowthKeyframe {
    // Clamp growth stage to valid range
    const clampedStage = Math.max(0, Math.min(30, growthStage));
    const progress = clampedStage / 30; // 0 to 1
    
    // Map to 6 keyframes (0-5)
    const keyframeIndex = Math.min(Math.floor(progress * 5), 4);
    const nextKeyframeIndex = Math.min(keyframeIndex + 1, 5);
    const localProgress = (progress * 5) - keyframeIndex;
    
    const current = GROWTH_KEYFRAMES[keyframeIndex];
    const next = GROWTH_KEYFRAMES[nextKeyframeIndex];
    
    // Smooth interpolation between keyframes
    return {
      scale: THREE.MathUtils.lerp(current.scale, next.scale, localProgress),
      leafCount: Math.floor(THREE.MathUtils.lerp(current.leafCount, next.leafCount, localProgress)),
      stemHeight: THREE.MathUtils.lerp(current.stemHeight, next.stemHeight, localProgress),
      leafSize: THREE.MathUtils.lerp(current.leafSize, next.leafSize, localProgress),
      unfurlAmount: THREE.MathUtils.lerp(current.unfurlAmount, next.unfurlAmount, localProgress),
    };
  }

  // Create high-fidelity leaf geometry based on species
  private createLeafGeometry(shape: string, size: number): THREE.BufferGeometry {
    switch (shape) {
      case 'monstera': {
        // Monstera leaf with fenestrations (holes)
        const leafShape = new THREE.Shape();
        leafShape.moveTo(0, 0);
        leafShape.bezierCurveTo(size * 0.3, size * 0.2, size * 0.5, size * 0.5, size * 0.3, size);
        leafShape.bezierCurveTo(size * 0.1, size * 0.8, -size * 0.1, size * 0.8, -size * 0.3, size);
        leafShape.bezierCurveTo(-size * 0.5, size * 0.5, -size * 0.3, size * 0.2, 0, 0);
        
        const extrudeSettings = { depth: 0.01, bevelEnabled: false };
        return new THREE.ExtrudeGeometry(leafShape, extrudeSettings);
      }
      case 'fiddle': {
        // Fiddle leaf fig - violin shaped
        const leafShape = new THREE.Shape();
        leafShape.moveTo(0, 0);
        leafShape.bezierCurveTo(size * 0.2, size * 0.3, size * 0.4, size * 0.4, size * 0.35, size * 0.7);
        leafShape.bezierCurveTo(size * 0.3, size * 0.9, size * 0.15, size, 0, size);
        leafShape.bezierCurveTo(-size * 0.15, size, -size * 0.3, size * 0.9, -size * 0.35, size * 0.7);
        leafShape.bezierCurveTo(-size * 0.4, size * 0.4, -size * 0.2, size * 0.3, 0, 0);
        
        const extrudeSettings = { depth: 0.008, bevelEnabled: false };
        return new THREE.ExtrudeGeometry(leafShape, extrudeSettings);
      }
      case 'palm': {
        // Long palm-like leaf
        const leafShape = new THREE.Shape();
        leafShape.moveTo(0, 0);
        leafShape.bezierCurveTo(size * 0.15, size * 0.3, size * 0.1, size * 0.7, 0, size * 1.2);
        leafShape.bezierCurveTo(-size * 0.1, size * 0.7, -size * 0.15, size * 0.3, 0, 0);
        
        const extrudeSettings = { depth: 0.005, bevelEnabled: false };
        return new THREE.ExtrudeGeometry(leafShape, extrudeSettings);
      }
      case 'succulent': {
        // Thick succulent leaf
        return new THREE.CapsuleGeometry(size * 0.15, size * 0.4, 8, 16);
      }
      case 'bonsai': {
        // Small clustered leaves
        return new THREE.SphereGeometry(size * 0.5, 8, 6);
      }
      default:
        return new THREE.SphereGeometry(size * 0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    }
  }

  // Create subsurface scattering material for leaves
  private createLeafMaterial(config: PlantSpeciesConfig, health: number, growthState: GrowthKeyframe): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader: subsurfaceScatteringVertexShader,
      fragmentShader: subsurfaceScatteringFragmentShader,
      uniforms: {
        baseColor: { value: config.baseColor },
        subsurfaceColor: { value: config.subsurfaceColor },
        subsurfaceIntensity: { value: 0.6 },
        roughness: { value: 0.4 },
        health: { value: health },
        lightPosition: { value: new THREE.Vector3(5, 10, 5) },
        time: { value: 0 },
        growthProgress: { value: growthState.scale },
        unfurlAmount: { value: growthState.unfurlAmount },
        droopAmount: { value: (1 - health) * 0.8 },
      },
      side: THREE.DoubleSide,
    });
  }

  // Create wither material for unhealthy plants
  private createWitherMaterial(config: PlantSpeciesConfig, health: number): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader: witherVertexShader,
      fragmentShader: witherFragmentShader,
      uniforms: {
        baseColor: { value: config.baseColor },
        health: { value: health },
        time: { value: 0 },
        droopAmount: { value: (1 - health) * 0.8 },
      },
      side: THREE.DoubleSide,
    });
  }

  private createPlant(speciesId: string, growthStage: number, health: number): THREE.Group {
    const group = new THREE.Group();
    const config = PLANT_CONFIGS[speciesId] || PLANT_CONFIGS['monstera-albo'];
    const growthState = this.getGrowthState(growthStage);
    
    const materials: THREE.ShaderMaterial[] = [];

    // Luxury pot with PBR materials
    const potGeometry = new THREE.CylinderGeometry(0.28, 0.22, 0.45, 32);
    const potMaterial = new THREE.MeshStandardMaterial({
      color: '#1A1A1A',
      roughness: 0.2,
      metalness: 0.3,
    });
    const pot = new THREE.Mesh(potGeometry, potMaterial);
    pot.position.y = -0.32;
    pot.castShadow = true;
    pot.receiveShadow = true;
    group.add(pot);

    // Gold rim with high metalness
    const rimGeometry = new THREE.TorusGeometry(0.28, 0.025, 16, 48);
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: '#D4AF37',
      roughness: 0.15,
      metalness: 0.9,
      envMapIntensity: 1.5,
    });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.position.y = -0.1;
    rim.rotation.x = Math.PI / 2;
    rim.castShadow = true;
    group.add(rim);

    // Rich soil with texture variation
    const soilGeometry = new THREE.CylinderGeometry(0.24, 0.24, 0.12, 32);
    const soilMaterial = new THREE.MeshStandardMaterial({
      color: '#2A1A0A',
      roughness: 0.95,
      metalness: 0.0,
    });
    const soil = new THREE.Mesh(soilGeometry, soilMaterial);
    soil.position.y = -0.14;
    soil.receiveShadow = true;
    group.add(soil);

    // Plant group with growth scaling
    const plantGroup = new THREE.Group();
    plantGroup.scale.setScalar(growthState.scale);

    // Stem with organic shape
    const stemCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.02, config.stemHeight * growthState.stemHeight * 0.3, 0.01),
      new THREE.Vector3(-0.01, config.stemHeight * growthState.stemHeight * 0.6, -0.01),
      new THREE.Vector3(0, config.stemHeight * growthState.stemHeight, 0),
    ]);
    const stemGeometry = new THREE.TubeGeometry(stemCurve, 20, config.stemRadius, 8, false);
    const stemMaterial = new THREE.MeshStandardMaterial({
      color: config.baseColor.clone().multiplyScalar(0.7),
      roughness: 0.7,
      metalness: 0.0,
    });
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.castShadow = true;
    plantGroup.add(stem);

    // Create leaves with subsurface scattering
    const leafGeometry = this.createLeafGeometry(config.leafShape, config.leafSize * growthState.leafSize);
    const actualLeafCount = Math.min(growthState.leafCount, config.leafCount);

    for (let i = 0; i < actualLeafCount; i++) {
      const angle = (i / actualLeafCount) * Math.PI * 2 + (i * 0.3);
      const heightProgress = i / actualLeafCount;
      const height = config.stemHeight * growthState.stemHeight * (0.3 + heightProgress * 0.7);
      
      // Use subsurface material for healthy plants, wither material for unhealthy
      const leafMaterial = health > 0.5 
        ? this.createLeafMaterial(config, health, growthState)
        : this.createWitherMaterial(config, health);
      materials.push(leafMaterial);

      const leafGroup = new THREE.Group();
      leafGroup.position.y = height;
      
      // Droop based on health
      const droop = (1 - health) * 0.6 * heightProgress;
      leafGroup.rotation.set(droop + 0.2, angle, 0);

      const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
      leaf.position.x = 0.1 + heightProgress * 0.1;
      leaf.rotation.set(-0.3 - droop, 0, -0.4);
      leaf.scale.setScalar(0.7 + heightProgress * 0.3);
      leaf.castShadow = true;
      leafGroup.add(leaf);

      // Add variegation overlay if applicable
      if (config.hasVariegation && config.variegationColor) {
        const variegationMaterial = new THREE.MeshStandardMaterial({
          color: config.variegationColor,
          transparent: true,
          opacity: 0.4 + Math.random() * 0.3,
          roughness: 0.5,
          side: THREE.DoubleSide,
        });
        const variegation = new THREE.Mesh(leafGeometry.clone(), variegationMaterial);
        variegation.position.copy(leaf.position);
        variegation.rotation.copy(leaf.rotation);
        variegation.scale.copy(leaf.scale).multiplyScalar(0.95);
        variegation.position.z += 0.005;
        leafGroup.add(variegation);
      }

      plantGroup.add(leafGroup);
    }

    group.add(plantGroup);
    
    // Store materials for animation updates
    this.plantMaterials.set(group.uuid, materials);
    
    return group;
  }

  updatePlants(plants: Plant[], selectedPlantId: string | null) {
    // Remove old plants
    this.plants.forEach((plantMesh, id) => {
      if (!plants.find((p) => p.id === id)) {
        this.scene.remove(plantMesh);
        this.plantIdMap.delete(plantMesh);
        this.plantMaterials.delete(plantMesh.uuid);
        this.plantData.delete(id);
        this.plants.delete(id);
      }
    });

    // Add/update plants
    plants.forEach((plant, index) => {
      const x = (index - (plants.length - 1) / 2) * 2.5;

      let plantMesh = this.plants.get(plant.id);
      const existingData = this.plantData.get(plant.id);
      
      // Recreate plant if growth stage or health changed significantly
      const needsRecreate = !plantMesh || 
        !existingData ||
        Math.abs(existingData.growthStage - plant.growthStage) > 2 ||
        Math.abs(existingData.health - plant.health) > 0.2;
      
      if (needsRecreate) {
        if (plantMesh) {
          this.scene.remove(plantMesh);
          this.plantIdMap.delete(plantMesh);
          this.plantMaterials.delete(plantMesh.uuid);
        }
        
        plantMesh = this.createPlant(plant.speciesId, plant.growthStage, plant.health);
        this.plants.set(plant.id, plantMesh);
        this.plantIdMap.set(plantMesh, plant.id);
        this.plantData.set(plant.id, {
          speciesId: plant.speciesId,
          growthStage: plant.growthStage,
          health: plant.health,
        });
        this.scene.add(plantMesh);
      }

      plantMesh.position.set(x, 0, 0);

      // Selection highlight with smooth scaling
      const isSelected = selectedPlantId === plant.id;
      const targetScale = isSelected ? 1.08 : 1;
      plantMesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    });

    // Update roots
    this.updateRoots(plants.length);
  }

  private updateRoots(plantCount: number) {
    if (!this.roots) return;

    // Clear existing roots
    while (this.roots.children.length > 0) {
      const child = this.roots.children[0];
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
      this.roots.remove(child);
    }
    this.rootMaterials = [];

    if (plantCount < 2) return;

    const { streak, rootNetworkExpansion, careConsistency } = useGardenStore.getState();
    
    // Root network expands with streak
    const branchDensity = rootNetworkExpansion;
    const intensity = careConsistency;

    for (let i = 0; i < plantCount - 1; i++) {
      const startX = (i - (plantCount - 1) / 2) * 2.5;
      const endX = startX + 2.5;

      // Create organic root curve with more control points for animation
      const rootCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(startX, -0.48, 0),
        new THREE.Vector3(startX + 0.4, -0.48, 0.15 * Math.sin(i)),
        new THREE.Vector3(startX + 0.8, -0.48, -0.1 * Math.cos(i)),
        new THREE.Vector3(startX + 1.25, -0.48, 0.12 * Math.sin(i * 1.5)),
        new THREE.Vector3(startX + 1.7, -0.48, -0.08 * Math.cos(i * 2)),
        new THREE.Vector3(startX + 2.1, -0.48, 0.05 * Math.sin(i * 2)),
        new THREE.Vector3(endX, -0.48, 0),
      ]);

      const rootGeometry = new THREE.TubeGeometry(rootCurve, 32, 0.015 + intensity * 0.015, 8, false);
      const rootMaterial = new THREE.MeshStandardMaterial({
        color: '#D4AF37',
        emissive: '#D4AF37',
        emissiveIntensity: 0.3 + intensity * 0.5,
        transparent: true,
        opacity: 0.4 + intensity * 0.4,
        roughness: 0.2,
        metalness: 0.8,
      });
      const root = new THREE.Mesh(rootGeometry, rootMaterial);
      this.roots.add(root);
      this.rootMaterials.push(rootMaterial);
      
      // Add branching roots - expands with streak
      const branchCount = Math.floor(branchDensity * 3);
      for (let b = 0; b < branchCount; b++) {
        const branchStart = startX + 0.5 + b * 0.6;
        const branchCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(branchStart, -0.48, 0),
          new THREE.Vector3(branchStart + 0.2, -0.48, 0.2 * (b % 2 === 0 ? 1 : -1)),
          new THREE.Vector3(branchStart + 0.4, -0.48, 0.3 * (b % 2 === 0 ? 1 : -1)),
        ]);
        const branchGeometry = new THREE.TubeGeometry(branchCurve, 12, 0.008, 6, false);
        const branchMaterial = new THREE.MeshStandardMaterial({
          color: '#D4AF37',
          emissive: '#D4AF37',
          emissiveIntensity: 0.2 + intensity * 0.3,
          transparent: true,
          opacity: 0.3 + intensity * 0.3,
          roughness: 0.3,
          metalness: 0.7,
        });
        const branch = new THREE.Mesh(branchGeometry, branchMaterial);
        this.roots.add(branch);
        this.rootMaterials.push(branchMaterial);
      }
    }
  }

  // Animate root glow and expansion based on gamification metrics
  private animateRoots(time: number) {
    const { streak, rootNetworkExpansion, careConsistency, lightingMode } = useGardenStore.getState();
    
    // Base intensity from care consistency
    const baseIntensity = careConsistency;
    
    // Pulsing intensity based on streak
    const streakPulse = Math.sin(time * 1.5) * 0.2 + 0.8;
    
    // Lighting mode affects glow color
    const isAtRisk = lightingMode === 'twilight';
    
    this.rootMaterials.forEach((material, index) => {
      // Pulsing glow animation
      const pulse = Math.sin(time * 2 + index * 0.5) * 0.2 + 0.8;
      material.emissiveIntensity = (0.3 + baseIntensity * 0.5) * pulse * streakPulse;
      
      // Flowing light effect
      const flow = Math.sin(time * 3 + index * 0.3) * 0.1;
      material.opacity = Math.max(0.2, (0.4 + baseIntensity * 0.4) + flow);
      
      // Color shift based on lighting mode
      if (isAtRisk) {
        // Twilight: shift towards blue
        material.emissive.setHex(0x4A6B8A);
      } else {
        // Golden hour: maintain gold
        material.emissive.setHex(0xD4AF37);
      }
    });
  }

  updateCamera(selectedPlantId: string | null, isInspecting: boolean) {
    // Store current position for Bézier interpolation
    this.cameraStartPosition.copy(this.currentCameraPosition);
    this.cameraStartLookAt.copy(this.currentLookAt);
    this.cameraAnimationProgress = 0;
    
    if (isInspecting && selectedPlantId) {
      const plantMesh = this.plants.get(selectedPlantId);
      if (plantMesh) {
        // Close-up inspection view with depth of field
        this.cameraEndPosition.set(plantMesh.position.x, 1.5, 3.5);
        this.cameraEndLookAt.set(plantMesh.position.x, 0.5, 0);
        this.targetDofStrength = 1.0; // Enable DoF
        this.focusDistance = 3.5;
      }
    } else {
      // Gallery view - follow scroll position
      this.cameraEndPosition.set(this.scrollPosition, 2, 8);
      this.cameraEndLookAt.set(this.scrollPosition, 0, 0);
      this.targetDofStrength = 0; // Disable DoF
    }
  }

  // Bézier curve interpolation for smooth camera dolly
  private bezierEase(t: number): number {
    // Cubic Bézier ease-in-out curve
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // Update camera with dolly animation
  private updateCameraAnimation(deltaTime: number) {
    if (this.cameraAnimationProgress < 1) {
      this.cameraAnimationProgress += deltaTime / this.cameraAnimationDuration;
      this.cameraAnimationProgress = Math.min(1, this.cameraAnimationProgress);
      
      const t = this.bezierEase(this.cameraAnimationProgress);
      
      // Interpolate position along Bézier curve
      this.currentCameraPosition.lerpVectors(
        this.cameraStartPosition,
        this.cameraEndPosition,
        t
      );
      
      this.currentLookAt.lerpVectors(
        this.cameraStartLookAt,
        this.cameraEndLookAt,
        t
      );
    } else {
      // Continue following scroll when not animating
      if (this.targetDofStrength === 0) {
        this.targetCameraPosition.set(this.scrollPosition, 2, 8);
        this.targetLookAt.set(this.scrollPosition, 0, 0);
        this.currentCameraPosition.lerp(this.targetCameraPosition, 0.08);
        this.currentLookAt.lerp(this.targetLookAt, 0.08);
      }
    }
    
    // Apply camera position
    this.camera.position.copy(this.currentCameraPosition);
    this.camera.lookAt(this.currentLookAt);
    
    // Smooth DoF transition
    this.dofStrength += (this.targetDofStrength - this.dofStrength) * 0.05;
  }

  // Apply depth of field effect to non-focused plants
  private applyDepthOfField() {
    if (this.dofStrength < 0.01) return;
    
    this.plants.forEach((plant) => {
      const distance = Math.abs(plant.position.z - this.focusDistance);
      const blur = Math.min(1, distance * 0.3) * this.dofStrength;
      
      // Scale down slightly for blur simulation
      const targetScale = 1 - blur * 0.05;
      plant.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    });
  }

  updateLighting(mode: 'golden' | 'twilight') {
    if (!this.directionalLight) return;
    const targetColor = mode === 'golden' ? new THREE.Color('#FFD700') : new THREE.Color('#4A6B8A');
    this.directionalLight.color.lerp(targetColor, 0.02);
  }

  updateTheme(mode: 'dark' | 'light') {
    if (mode === 'light') {
      // Light mode - bright, airy greenhouse feel
      this.scene.background = new THREE.Color('#F5F3EE');
      this.scene.fog = new THREE.FogExp2(0xF5F3EE, 0.02);
      
      if (this.directionalLight) {
        this.directionalLight.intensity = 2.0;
        this.directionalLight.color.set('#FFFFFF');
      }
      
      if (this.floor) {
        (this.floor.material as THREE.MeshStandardMaterial).color.set('#E8E4DC');
      }
      
      // Update parallax background for light mode
      if (this.backgroundGroup) {
        this.backgroundGroup.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            if (child.material.opacity < 0.1) {
              // Glass panels
              child.material.color.set('#87CEEB');
              child.material.opacity = 0.1;
            } else {
              // Beams
              child.material.color.set('#C0C0C0');
              child.material.opacity = 0.6;
            }
          }
        });
      }
    } else {
      // Dark mode - luxury void aesthetic
      this.scene.background = new THREE.Color('#050505');
      this.scene.fog = new THREE.FogExp2(0x050505, 0.03);
      
      if (this.directionalLight) {
        this.directionalLight.intensity = 1.5;
        this.directionalLight.color.set('#FFD700');
      }
      
      if (this.floor) {
        (this.floor.material as THREE.MeshStandardMaterial).color.set('#0A0A0A');
      }
      
      // Update parallax background for dark mode
      if (this.backgroundGroup) {
        this.backgroundGroup.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            if (child.material.opacity < 0.15) {
              // Glass panels
              child.material.color.set('#87CEEB');
              child.material.opacity = 0.05;
            } else {
              // Beams
              child.material.color.set('#1A1A1A');
              child.material.opacity = 0.4;
            }
          }
        });
      }
    }
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);

    const time = this.clock.getElapsedTime();
    const deltaTime = this.clock.getDelta();

    // Apply scroll inertia (heavy friction for luxury feel)
    if (!this.isDragging) {
      this.scrollVelocity *= this.scrollFriction;
      this.targetScrollPosition += this.scrollVelocity;
    }
    
    // Clamp scroll position based on plant count
    const plantCount = this.plants.size;
    const maxScroll = Math.max(0, (plantCount - 1) * 1.25);
    this.targetScrollPosition = Math.max(-maxScroll, Math.min(maxScroll, this.targetScrollPosition));
    
    // Smooth scroll interpolation
    this.scrollPosition += (this.targetScrollPosition - this.scrollPosition) * 0.08;

    // Update parallax background (10% speed)
    if (this.backgroundGroup) {
      this.backgroundGroup.position.x = -this.scrollPosition * this.parallaxFactor;
    }

    // Update camera with dolly animation
    this.updateCameraAnimation(deltaTime || 0.016);

    // Apply depth of field
    this.applyDepthOfField();

    // Animate golden root system
    this.animateRoots(time);

    // Update shader uniforms for all plants
    this.plants.forEach((plant, id) => {
      // Gentle swaying animation
      plant.rotation.y = Math.sin(time * 0.5 + plant.position.x) * 0.03;
      
      // Update shader materials with time
      const materials = this.plantMaterials.get(plant.uuid);
      if (materials) {
        materials.forEach((material) => {
          if (material.uniforms) {
            material.uniforms.time.value = time;
            
            // Update light position based on directional light
            if (this.directionalLight && material.uniforms.lightPosition) {
              material.uniforms.lightPosition.value.copy(this.directionalLight.position);
            }
          }
        });
      }
    });

    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    // Dispose all plant materials
    this.plantMaterials.forEach((materials) => {
      materials.forEach((material) => material.dispose());
    });
    this.plantMaterials.clear();
    
    // Dispose root materials
    this.rootMaterials.forEach((material) => material.dispose());
    this.rootMaterials = [];
    
    // Dispose all plant geometries
    this.plants.forEach((plant) => {
      plant.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          } else if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          }
        }
      });
    });
    
    // Dispose background
    if (this.backgroundGroup) {
      this.backgroundGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
    }
    
    this.renderer.domElement.removeEventListener('click', this.handleClick.bind(this));
    this.renderer.domElement.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.renderer.domElement.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.renderer.domElement.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    this.renderer.domElement.removeEventListener('mouseleave', this.handleMouseUp.bind(this));
    this.renderer.domElement.removeEventListener('wheel', this.handleWheel.bind(this));
    this.renderer.domElement.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.renderer.domElement.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.renderer.domElement.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    window.removeEventListener('resize', this.handleResize.bind(this));
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

interface GardenSceneProps {
  onPlantSelect: (id: string) => void;
  themeMode?: 'dark' | 'light';
}

export function GardenScene({ onPlantSelect, themeMode = 'dark' }: GardenSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<GardenSceneManager | null>(null);

  const plants = useGardenStore((state) => state.plants);
  const selectedPlantId = useGardenStore((state) => state.selectedPlantId);
  const isInspecting = useGardenStore((state) => state.isInspecting);
  const lightingMode = useGardenStore((state) => state.lightingMode);

  const handlePlantClick = useCallback(
    (id: string) => {
      onPlantSelect(id);
    },
    [onPlantSelect]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    sceneManagerRef.current = new GardenSceneManager(containerRef.current);
    sceneManagerRef.current.setOnPlantClick(handlePlantClick);

    return () => {
      sceneManagerRef.current?.dispose();
      sceneManagerRef.current = null;
    };
  }, [handlePlantClick]);

  useEffect(() => {
    sceneManagerRef.current?.updatePlants(plants, selectedPlantId);
  }, [plants, selectedPlantId]);

  useEffect(() => {
    sceneManagerRef.current?.updateCamera(selectedPlantId, isInspecting);
  }, [selectedPlantId, isInspecting]);

  useEffect(() => {
    sceneManagerRef.current?.updateLighting(lightingMode);
  }, [lightingMode]);

  useEffect(() => {
    sceneManagerRef.current?.updateTheme(themeMode);
  }, [themeMode]);

  return <div ref={containerRef} className="w-full h-full" />;
}
