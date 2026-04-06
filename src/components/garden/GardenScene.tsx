import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { useGardenStore, Plant } from '@/store/gardenStore';

// Custom shaders for advanced plant rendering
// Custom shaders for advanced plant rendering
const subsurfaceScatteringVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  
  #include <fog_pars_vertex>
  
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
    
    #include <fog_vertex>
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
  
  #include <fog_pars_fragment>
  
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
    
    // Combine lighting - INCREASED AMBIENT TERM from 0.3 to 0.6 for visibility
    vec3 diffuse = finalBaseColor * (NdotL * 0.6 + 0.6); 
    vec3 subsurface = subsurfaceColor * sss * health;
    vec3 rim = vec3(0.2) * fresnel * 0.3;
    
    vec3 finalColor = diffuse + subsurface + rim;
    
    // Add subtle color variation
    float variation = sin(vUv.x * 20.0 + vUv.y * 15.0 + time * 0.5) * 0.05;
    finalColor += variation * health;
    
    gl_FragColor = vec4(finalColor, 1.0);
    
    #include <fog_fragment>
  }
`;

const witherVertexShader = `
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec3 vPosition;
  
  #include <fog_pars_vertex>
  
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
    
    #include <fog_vertex>
  }
`;

const witherFragmentShader = `
  uniform vec3 baseColor;
  uniform float health;
  uniform float time;
  
  #include <fog_pars_fragment>
  
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
    
    gl_FragColor = vec4(color, 1.0);
    
    #include <fog_fragment>
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
  'test-plant-fast': {
    stemHeight: 0.5,
    stemRadius: 0.02,
    leafShape: 'succulent',
    leafSize: 0.2,
    leafCount: 12,
    baseColor: new THREE.Color('#2E5A2E'),
    subsurfaceColor: new THREE.Color('#4F7942'),
    hasVariegation: true,
    variegationColor: new THREE.Color('#FFFFFF'),
  },
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
    baseColor: new THREE.Color('#0A0F0A'),
    subsurfaceColor: new THREE.Color('#1A2A1A'),
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
  'maidenhair-fern': {
    stemHeight: 0.3,
    stemRadius: 0.01,
    leafShape: 'monstera', // Fallback shape for now
    leafSize: 0.1,
    leafCount: 40,
    baseColor: new THREE.Color('#90EE90'),
    subsurfaceColor: new THREE.Color('#98FB98'),
    hasVariegation: false,
  },
  'calathea-orbifolia': {
    stemHeight: 0.4,
    stemRadius: 0.03,
    leafShape: 'palm',
    leafSize: 0.4,
    leafCount: 8,
    baseColor: new THREE.Color('#98FB98'),
    subsurfaceColor: new THREE.Color('#E0FFF0'),
    hasVariegation: true,
    variegationColor: new THREE.Color('#F0FFF0'),
  },
  'test-plant': {
    stemHeight: 0.5,
    stemRadius: 0.05,
    leafShape: 'succulent',
    leafSize: 0.3,
    leafCount: 5,
    baseColor: new THREE.Color('#FF00FF'), // Bright nebula pink for visibility
    subsurfaceColor: new THREE.Color('#00FFFF'),
    hasVariegation: true,
    variegationColor: new THREE.Color('#FFFFFF'),
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
  private composer: EffectComposer | undefined;
  private bloomPass: UnrealBloomPass | undefined;
  private plants: Map<string, THREE.Group> = new Map();
  private plantMaterials: Map<string, THREE.ShaderMaterial[]> = new Map();
  private plantData: Map<string, { speciesId: string; growthStage: number; health: number }> = new Map();
  private floor: THREE.Mesh | null = null;
  private roots: THREE.Group | null = null;
  private rootMaterials: THREE.MeshStandardMaterial[] = [];
  private sparkles: THREE.Points | null = null;
  private directionalLight: THREE.DirectionalLight | null = null;
  private hemisphereLight: THREE.HemisphereLight | null = null;
  private pendantLights: THREE.PointLight[] = [];
  private stars: THREE.Points | null = null;
  private groundTexture: THREE.CanvasTexture | null = null;
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

  // Performance Monitoring
  private frameCount = 0;
  private lastTime = 0;
  private performanceLevel: 'high' | 'low' = 'high';
  private lowFpsFrames = 0;

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

  // State
  private currentTheme: 'dark' | 'light' = 'dark';
  private currentBackgroundType: 'greenhouse' | 'garden' | 'forest' | 'farm' | 'none' = 'greenhouse';

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
    this.renderer.toneMappingExposure = 1.0; // Reduced from 1.2
    container.appendChild(this.renderer.domElement);

    // FPS Monitor


    // Post-Processing Setup
    this.composer = new EffectComposer(this.renderer);

    // 1. Render Pass
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // 2. Bloom Pass (Dreamy/Ethereal)
    const resolution = new THREE.Vector2(container.clientWidth, container.clientHeight);
    this.bloomPass = new UnrealBloomPass(resolution, 1.5, 0.4, 0.85);
    this.bloomPass.threshold = 0.95; // Increased significantly to only allow glowing plants to bloom
    this.bloomPass.strength = 0.6;   // Subtler glow
    this.bloomPass.radius = 0.8;     // Softer bloom 
    this.composer.addPass(this.bloomPass);

    // 3. Output Pass (Tone Mapping & Color Correction)
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);

    // Enhanced Lighting for PBR
    // Hemisphere Light (Sky + Ground) - better than flat ambient
    this.hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    this.scene.add(this.hemisphereLight);

    // Main directional light (sun)
    this.directionalLight = new THREE.DirectionalLight(0xffd700, 1.5);
    this.directionalLight.position.set(15, 25, 15); // Higher and more angled sun
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 4096;
    this.directionalLight.shadow.mapSize.height = 4096;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 100;
    this.directionalLight.shadow.camera.left = -60; // Expanded for wider coverage
    this.directionalLight.shadow.camera.right = 60;
    this.directionalLight.shadow.camera.top = 60;
    this.directionalLight.shadow.camera.bottom = -60;
    this.directionalLight.shadow.bias = -0.0005;
    this.directionalLight.shadow.normalBias = 0.02; // Better shadow quality
    this.scene.add(this.directionalLight);

    // Fill light (removed in favor of hemisphere)
    // const fillLight = new THREE.DirectionalLight(0x87ceeb, 0.3);
    // fillLight.position.set(-5, 5, -5);
    // this.scene.add(fillLight);

    // Rim light for plant highlights
    const rimLight = new THREE.PointLight(0xd4af37, 0.8);
    rimLight.position.set(-3, 3, 3);
    this.scene.add(rimLight);

    // Back light for subsurface scattering effect
    const backLight = new THREE.PointLight(0x90ee90, 0.5);
    backLight.position.set(0, 2, -5);
    this.scene.add(backLight);

    // Floor with marble-like material
    // Extended to cover deep greenhouse structures (60 units deep)
    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: '#0A0A0A',
      roughness: 0.85,
      metalness: 0.15,
    });
    this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.set(0, -0.5, -10); // Centered to cover z=20 to z=-40
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
    this.stars = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(this.stars);

    // Parallax background - greenhouse architecture
    this.setBackground('greenhouse');

    // Roots group
    this.roots = new THREE.Group();
    this.scene.add(this.roots);

    // Procedural Sparkles (Gamification Reward)
    const sparklesGeometry = new THREE.BufferGeometry();
    const sparklesCount = 200;
    const sparklesPos = new Float32Array(sparklesCount * 3);
    for (let i = 0; i < sparklesCount; i++) {
      sparklesPos[i * 3] = (Math.random() - 0.5) * 15;
      sparklesPos[i * 3 + 1] = Math.random() * 8;
      sparklesPos[i * 3 + 2] = (Math.random() - 0.5) * 15;
    }
    sparklesGeometry.setAttribute('position', new THREE.BufferAttribute(sparklesPos, 3));
    const sparklesMaterial = new THREE.PointsMaterial({
      color: 0xD4AF37,
      size: 0.15,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    });
    this.sparkles = new THREE.Points(sparklesGeometry, sparklesMaterial);
    this.scene.add(this.sparkles);

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

  // Switch background based on type
  setBackground(type: 'greenhouse' | 'garden' | 'forest' | 'farm' | 'none') {
    this.currentBackgroundType = type;

    // Toggle default floor visibility
    // Garden has its own floor at y=-0.5, so hide the default one to avoid z-fighting
    if (this.floor) {
      this.floor.visible = type !== 'garden';
    }

    if (this.backgroundGroup) {
      this.scene.remove(this.backgroundGroup);
      this.backgroundGroup = null;
    }

    // For 'none', we just leave it empty (void/simple background)
    if (type === 'none') {
      this.applyEnvironmentColors();
      return;
    }

    this.backgroundGroup = new THREE.Group();
    this.backgroundGroup.position.z = -15; // Move closer, was -20

    switch (type) {
      case 'forest':
        this.createForestBackground();
        break;
      case 'garden':
        this.createGardenBackground();
        break;
      case 'farm':
        this.createFarmBackground();
        break;
      case 'greenhouse':
      default:
        this.createGreenhouseBackground();
        break;
    }

    this.scene.add(this.backgroundGroup);

    // Apply colors based on current theme and background type (AFTER creating elements)
    this.applyEnvironmentColors();
  }

  private createDecorativePlant(type: 'fern' | 'succulent' | 'tree' | 'bush'): THREE.Group {
    const group = new THREE.Group();

    // Pot
    const potGeo = new THREE.CylinderGeometry(0.15, 0.1, 0.2, 8);
    const potMat = new THREE.MeshStandardMaterial({ color: '#8B4513', roughness: 0.9 });
    const pot = new THREE.Mesh(potGeo, potMat);
    pot.userData = { type: 'pot' };
    group.add(pot);

    // Foliage
    const foliageMat = new THREE.MeshStandardMaterial({ color: '#2E8B57', roughness: 0.8 });

    if (type === 'fern') {
      const leafGeo = new THREE.ConeGeometry(0.1, 0.6, 4);
      for (let i = 0; i < 5; i++) {
        const leaf = new THREE.Mesh(leafGeo, foliageMat);
        leaf.position.y = 0.2;
        leaf.rotation.z = Math.PI / 4;
        leaf.rotation.y = (i / 5) * Math.PI * 2;
        leaf.translateY(0.2);
        leaf.userData = { type: 'foliage' };
        group.add(leaf);
      }
    } else if (type === 'succulent') {
      const leafGeo = new THREE.SphereGeometry(0.08, 6, 6);
      for (let i = 0; i < 6; i++) {
        const leaf = new THREE.Mesh(leafGeo, foliageMat);
        leaf.position.y = 0.1;
        leaf.rotation.y = (i / 6) * Math.PI * 2;
        leaf.translateX(0.1);
        leaf.userData = { type: 'foliage' };
        group.add(leaf);
      }
      const center = new THREE.Mesh(leafGeo, foliageMat);
      center.position.y = 0.15;
      center.userData = { type: 'foliage' };
      group.add(center);
    } else if (type === 'tree') {
      const stemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.6);
      const stem = new THREE.Mesh(stemGeo, new THREE.MeshStandardMaterial({ color: '#4A3B2A' }));
      stem.position.y = 0.3;
      stem.userData = { type: 'wood' };
      group.add(stem);

      const canopyGeo = new THREE.DodecahedronGeometry(0.25);
      const canopy = new THREE.Mesh(canopyGeo, foliageMat);
      canopy.position.y = 0.6;
      canopy.userData = { type: 'foliage' };
      group.add(canopy);
    } else { // Bush
      const bushGeo = new THREE.IcosahedronGeometry(0.25, 0);
      const bush = new THREE.Mesh(bushGeo, foliageMat);
      bush.position.y = 0.2;
      bush.scale.y = 0.8;
      bush.userData = { type: 'foliage' };
      group.add(bush);
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

    }

    return group;
  }

  private createGroundPlant(type: 'grass' | 'fern' | 'bush' | 'stalk' | 'flower'): THREE.Group {
    const group = new THREE.Group();
    const foliageMat = new THREE.MeshStandardMaterial({ color: '#2E8B57', roughness: 0.8 });

    if (type === 'grass') {
      const leafGeo = new THREE.ConeGeometry(0.02, 0.3, 3);
      for (let i = 0; i < 8; i++) {
        const leaf = new THREE.Mesh(leafGeo, foliageMat);
        leaf.position.set((Math.random() - 0.5) * 0.2, 0.15, (Math.random() - 0.5) * 0.2);
        leaf.rotation.x = (Math.random() - 0.5) * 0.4;
        leaf.rotation.z = (Math.random() - 0.5) * 0.4;
        leaf.userData = { type: 'foliage' };
        group.add(leaf);
      }
    } else if (type === 'fern') {
      const leafGeo = new THREE.ConeGeometry(0.05, 0.8, 4);
      for (let i = 0; i < 6; i++) {
        const leaf = new THREE.Mesh(leafGeo, foliageMat);
        leaf.position.y = 0.4;
        leaf.rotation.z = Math.PI / 3;
        leaf.rotation.y = (i / 6) * Math.PI * 2;
        leaf.userData = { type: 'foliage' };
        group.add(leaf);
      }
    } else if (type === 'bush') {
      const bushGeo = new THREE.IcosahedronGeometry(0.35, 1);
      const bush = new THREE.Mesh(bushGeo, foliageMat);
      bush.position.y = 0.2;
      bush.scale.set(1.2, 0.7, 1.2);
      bush.userData = { type: 'foliage' };
      group.add(bush);
    } else if (type === 'stalk') {
      const stemGeo = new THREE.CylinderGeometry(0.01, 0.01, 1.2);
      const stem = new THREE.Mesh(stemGeo, new THREE.MeshStandardMaterial({ color: '#4A3B2A' }));
      stem.position.y = 0.6;
      stem.userData = { type: 'wood' };
      group.add(stem);

      const leafGeo = new THREE.SphereGeometry(0.08, 6, 6);
      for (let i = 0; i < 4; i++) {
        const leaf = new THREE.Mesh(leafGeo, foliageMat);
        leaf.position.set(0, 0.4 + i * 0.2, 0);
        leaf.rotation.y = i * Math.PI * 0.5;
        leaf.translateX(0.1);
        leaf.userData = { type: 'foliage' };
        group.add(leaf);
      }
    } else if (type === 'flower') {
      const bushGeo = new THREE.IcosahedronGeometry(0.3, 1);
      const bush = new THREE.Mesh(bushGeo, foliageMat);
      bush.position.y = 0.2;
      bush.userData = { type: 'foliage' };
      group.add(bush);

      const flowerGeo = new THREE.SphereGeometry(0.06, 4, 4);
      const flowerMat = new THREE.MeshStandardMaterial({ color: '#FF4444', emissive: '#441111' });
      for (let i = 0; i < 5; i++) {
        const flower = new THREE.Mesh(flowerGeo, flowerMat);
        flower.position.set((Math.random() - 0.5) * 0.4, 0.3 + Math.random() * 0.2, (Math.random() - 0.5) * 0.4);
        flower.userData = { type: 'foliage' }; // Color with foliage tint fallback
        group.add(flower);
      }
    }

    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return group;
  }
  private applyEnvironmentColors() {
    if (!this.floor) return;
    const floorMat = this.floor.material as THREE.MeshStandardMaterial;
    // const { showFog } = useGardenStore.getState();

    // Apply procedural texture if not already set
    if (!floorMat.map) {
      floorMat.map = this.createProceduralGroundTexture();
      floorMat.bumpMap = floorMat.map;
      floorMat.bumpScale = 0.02;
      floorMat.needsUpdate = true;
    }

    if (this.currentTheme === 'light') {
      // Light Mode - Warm afternoon sunlight
      const isGarden = this.currentBackgroundType === 'garden';
      const isGreenhouse = this.currentBackgroundType === 'greenhouse';
      const isFarm = this.currentBackgroundType === 'farm';

      if (this.currentBackgroundType === 'forest') {
        this.scene.background = new THREE.Color('#B0C4B0'); // Silvery Green/Grey
        this.scene.fog = null; // showFog ? new THREE.FogExp2('#B0C4B0', 0.015) : null; // Thicker fog for forest
      } else if (isGarden) {
        this.scene.background = new THREE.Color('#A0C4FF'); // Sky Blue
        this.scene.fog = null; // showFog ? new THREE.FogExp2('#A0C4FF', 0.003) : null;
      } else if (isFarm) {
        // High Fidelity Golden Hour
        this.scene.background = new THREE.Color('#FFAB91'); // Warm Sunset Peach/Orange
        this.scene.fog = null; // showFog ? new THREE.FogExp2('#FFCC80', 0.005) : null; // Golden Haze
      } else {
        this.scene.background = new THREE.Color('#FDFBF4'); // Warmer Cream/White
        this.scene.fog = null; // showFog ? new THREE.FogExp2(0xFDFBF4, 0.005) : null;
      }

      if (this.stars) this.stars.visible = false; // Hide stars in daytime

      // Floor colors for Light Mode
      switch (this.currentBackgroundType) {
        case 'forest':
          floorMat.color.set('#2D3F2D'); // Darker, damp forest floor
          break;
        case 'garden': floorMat.color.set('#4A6A4A'); break; // Grassy Green
        case 'farm': floorMat.color.set('#4E342E'); break; // Lighter, warmer soil for better contrast
        case 'none': floorMat.color.set('#E8E4DC'); break; // Neutral floor
        case 'greenhouse':
        default:
          floorMat.color.set('#D0D0D0'); // Light Grey Concrete (texture shows through)
          break;
      }

      if (this.directionalLight) {
        const isForest = this.currentBackgroundType === 'forest';
        // Farm gets warm golden hour light
        const lightColor = isGarden ? '#FFF9E5' :
          (isForest ? '#D0E0D0' :
            (isFarm ? '#FFB74D' : '#FFB74D')); // Strong Golden

        const intensity = isGarden ? 3.5 :
          (isForest ? 2.5 :
            (isFarm ? 4.5 : 1.5)); // Brighter sun for farm

        this.directionalLight.intensity = intensity;
        this.directionalLight.color.set(lightColor);

        if (isFarm) {
          // Move sun to front-left (Z > 0) to illuminate the front of the plants
          this.directionalLight.position.set(-40, 40, 40);
          this.directionalLight.shadow.bias = -0.0002;
        } else {
          this.directionalLight.shadow.bias = (isGarden || isForest) ? -0.0001 : -0.001;
        }
      }

      if (this.hemisphereLight) {
        this.hemisphereLight.color.set('#FFFFFF');
        this.hemisphereLight.groundColor.set(
          this.currentBackgroundType === 'forest' ? '#1A2A1A' :
            (isFarm ? '#3E2723' : '#E6E0D0')
        );
        this.hemisphereLight.intensity = (isGarden || this.currentBackgroundType === 'forest') ? 0.3 : (isFarm ? 0.6 : 0.5); // Boost farm ambient light
      }

      // Turn off pendant lights in daylight
      this.pendantLights.forEach(light => {
        light.intensity = 0;
      });

      // Update parallax background for light mode
      if (this.backgroundGroup) {
        this.backgroundGroup.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {

            if (child.userData.type === 'glass') {
              child.material.color.set('#B0B0B0'); // Smoke tint
              child.material.opacity = isGreenhouse ? 0.3 : 0.15;
            } else if (child.userData.type === 'beam') {
              child.material.color.set('#121212'); // Matte black/charcoal
              child.material.roughness = 0.8;
              child.material.opacity = 1.0;
            } else if (child.userData.type === 'path') {
              child.material.color.set('#5C4D32'); // Earthy path
            } else if (child.userData.type === 'furniture') {
              child.material.color.set('#6B4423'); // Warmer, richer wood
            } else if (child.userData.type === 'fixture') {
              child.material.color.set('#0A0A0A'); // Near black for fixtures
            } else if (child.userData.type === 'bulb') {
              child.material.emissiveIntensity = 0.5;
            } else if (child.userData.type === 'pot') {
              child.material.color.set('#A0522D'); // Terracotta
            } else if (child.userData.type === 'foliage') {
              child.material.color.set('#3A5A3A'); // Natural green
            } else if (child.userData.type === 'wood') {
              child.material.color.set('#5C4033'); // Dark Wood
            } else if (child.userData.type === 'externalGround') {
              child.material.color.set(isGreenhouse ? '#D0D0D0' : '#3A5A3A'); // Seamless match for concrete
            } else if (child.userData.type === 'forest_trunk') {
              child.material.color.set(isGreenhouse ? '#3A3A3A' : '#2A1A0A'); // Desaturated trunks
            } else if (child.userData.type === 'forest_leaves') {
              child.material.color.set(isGreenhouse ? '#2A3A2A' : '#1E3F1E'); // Desaturated leaves
            }
          }
        });
      }
    } else {
      // Dark Mode - Luxury void aesthetic
      switch (this.currentBackgroundType) {
        case 'forest':
          this.scene.background = new THREE.Color('#051005');
          this.scene.fog = null; // showFog ? new THREE.FogExp2(0x051005, 0.04) : null;
          floorMat.color.set('#0A1A0A');
          break;
        case 'garden':
          this.scene.background = new THREE.Color('#050505');
          this.scene.fog = null; // showFog ? new THREE.FogExp2(0x050505, 0.04) : null;
          floorMat.color.set('#0A0A0A');
          break;
        case 'farm':
          this.scene.background = new THREE.Color('#100A05');
          this.scene.fog = null; // showFog ? new THREE.FogExp2(0x100A05, 0.04) : null;
          floorMat.color.set('#1A100A');
          break;
        case 'none':
          // Void
          this.scene.background = new THREE.Color('#050505');
          this.scene.fog = null; // showFog ? new THREE.FogExp2(0x050505, 0.03) : null;
          floorMat.color.set('#0A0A0A');
          break;
        case 'greenhouse':
        default:
          this.scene.background = new THREE.Color('#050505');
          this.scene.fog = null; // showFog ? new THREE.FogExp2(0x050505, 0.03) : null;
          floorMat.color.set('#112211'); // Dark grass
          break;
      }

      if (this.stars) this.stars.visible = true; // Return stars in dark mode

      if (this.directionalLight) {
        this.directionalLight.intensity = 0.15; // Dimmer Moon
        this.directionalLight.color.set('#B0C4DE'); // Cool Pale Blue
      }

      if (this.hemisphereLight) {
        this.hemisphereLight.color.set('#FFFFFF'); // Neutral Sky
        this.hemisphereLight.groundColor.set('#050505'); // Dark Deep Ground
        this.hemisphereLight.intensity = 0.1;
      }

      // Activate pendant lights in dark mode
      this.pendantLights.forEach(light => {
        light.intensity = 0.8;
      });

      // Update parallax background for dark mode
      if (this.backgroundGroup) {
        this.backgroundGroup.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {

            if (child.userData.type === 'glass') {
              child.material.color.set('#AADDFF');
              child.material.opacity = 0.25; // Catch more light/reflections
            } else if (child.userData.type === 'beam') {
              child.material.color.set('#0A0A0A');
              child.material.opacity = 1.0;
            } else if (child.userData.type === 'path') {
              child.material.color.set('#333333'); // Dark path
            } else if (child.userData.type === 'furniture') {
              child.material.color.set('#5C4033'); // Darker wood
            } else if (child.userData.type === 'fixture') {
              child.material.color.set('#000000');
            } else if (child.userData.type === 'bulb') {
              child.material.emissiveIntensity = 0.8;
            } else if (child.userData.type === 'pot') {
              child.material.color.set('#553311'); // Dark Terracotta
            } else if (child.userData.type === 'foliage') {
              child.material.color.set('#2E5A2E'); // Darker Green
            } else if (child.userData.type === 'wood') {
              child.material.color.set('#3E2B1F');
            } else if (child.userData.type === 'externalGround') {
              child.material.color.set('#081008'); // Very dark ground
            } else if (child.userData.type === 'forest_trunk') {
              child.material.color.set('#100505');
            } else if (child.userData.type === 'forest_leaves') {
              child.material.color.set('#051005'); // Silhouette
            }
          }
        });
      }
    }
  }

  private createGreenhouseBackground() {
    if (!this.backgroundGroup) return;

    // --- Materials ---
    const beamMaterial = new THREE.MeshStandardMaterial({
      color: '#121212',
      roughness: 0.8,
      metalness: 0.2,
      transparent: true,
      opacity: 1.0,
    });

    const glassMaterial = new THREE.MeshStandardMaterial({
      color: '#B0B0B0', // Grey smoke tint
      roughness: 0.1,
      metalness: 0.2,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });

    // Procedural Path Texture (Concrete/Stone noise)
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, 128, 128);
      // Add noise
      for (let i = 0; i < 2000; i++) {
        const x = Math.random() * 128;
        const y = Math.random() * 128;
        const alpha = Math.random() * 0.1;
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.fillRect(x, y, 1, 1);
      }
      // Add subtle grid
      ctx.strokeStyle = 'rgba(0,0,0,0.05)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, 128, 128);
    }
    const pathTexture = new THREE.CanvasTexture(canvas);
    pathTexture.wrapS = THREE.RepeatWrapping;
    pathTexture.wrapT = THREE.RepeatWrapping;
    pathTexture.repeat.set(2, 20);

    const pathMaterial = new THREE.MeshStandardMaterial({
      color: '#6B5B4B', // Earthy gravel/soil tone
      map: pathTexture,
      roughness: 1.0,
      metalness: 0.0,
    });

    const furnitureMaterial = new THREE.MeshStandardMaterial({
      color: '#8B5A2B', // Wood
      roughness: 0.8,
      metalness: 0.1,
    });

    // Simple Box Geometry reusing for performance where possible

    // Light fixtures
    const lightFixtureMaterial = new THREE.MeshStandardMaterial({
      color: '#1A1A1A',
      roughness: 0.5,
      metalness: 0.5,
    });

    const bulbMaterial = new THREE.MeshStandardMaterial({
      color: '#FFD700',
      emissive: '#FFD700',
      emissiveIntensity: 0.5,
    });


    // --- Dimensions ---
    const width = 24; // Total width
    const depth = 60; // Total depth
    const wallHeight = 6;
    const roofHeight = 4; // Height added by roof
    const baySize = 6;    // Distance between main columns
    const pathWidth = 6;

    // Z positioning relative to backgroundGroup (which is at z=-15)
    // We want structure to cover the view.
    const startZ = 20;
    const endZ = -40;
    const totalLength = startZ - endZ;

    // --- Structure ---

    // 1. Columns & Trusses (Repeated Frames)
    const colGeo = new THREE.BoxGeometry(0.4, wallHeight, 0.4);

    // Rafter calculation
    const rafterLength = Math.sqrt(Math.pow(width / 2, 2) + Math.pow(roofHeight, 2));
    const rafterAngle = Math.atan2(roofHeight, width / 2);
    const rafterGeo = new THREE.BoxGeometry(rafterLength + 0.5, 0.3, 0.3);

    const tieGeo = new THREE.BoxGeometry(width - 1, 0.2, 0.2);

    for (let z = startZ; z >= endZ; z -= baySize) {
      // Side Columns
      const leftCol = new THREE.Mesh(colGeo, beamMaterial);
      leftCol.position.set(-width / 2, wallHeight / 2, z);
      leftCol.userData = { type: 'beam' };
      leftCol.castShadow = true;
      leftCol.receiveShadow = true;
      this.backgroundGroup.add(leftCol);

      const rightCol = new THREE.Mesh(colGeo, beamMaterial);
      rightCol.position.set(width / 2, wallHeight / 2, z);
      rightCol.userData = { type: 'beam' };
      rightCol.castShadow = true;
      rightCol.receiveShadow = true;
      this.backgroundGroup.add(rightCol);

      // Roof Rafters (Gable)
      const leftRafter = new THREE.Mesh(rafterGeo, beamMaterial);
      leftRafter.position.set(-width / 4, wallHeight + roofHeight / 2, z);
      leftRafter.rotation.z = rafterAngle;
      leftRafter.userData = { type: 'beam' };
      leftRafter.castShadow = true;
      leftRafter.receiveShadow = true;
      this.backgroundGroup.add(leftRafter);

      const rightRafter = new THREE.Mesh(rafterGeo, beamMaterial);
      rightRafter.position.set(width / 4, wallHeight + roofHeight / 2, z);
      rightRafter.rotation.z = -rafterAngle;
      rightRafter.userData = { type: 'beam' };
      rightRafter.castShadow = true;
      rightRafter.receiveShadow = true;
      this.backgroundGroup.add(rightRafter);

      // Cross Tie
      const tie = new THREE.Mesh(tieGeo, beamMaterial);
      tie.position.set(0, wallHeight, z);
      tie.userData = { type: 'beam' };
      tie.castShadow = true;
      tie.receiveShadow = true;
      this.backgroundGroup.add(tie);

      // Hanging Light (Every other bay)
      if (Math.abs(z % (baySize * 2)) < 0.1 && z < 15) {
        const cordGeo = new THREE.CylinderGeometry(0.05, 0.05, 2);
        const cord = new THREE.Mesh(cordGeo, lightFixtureMaterial);
        cord.position.set(0, wallHeight + roofHeight - 1, z);
        cord.userData = { type: 'fixture' };
        this.backgroundGroup.add(cord);

        const shadeGeo = new THREE.ConeGeometry(0.6, 0.5, 32, 1, true);
        const shade = new THREE.Mesh(shadeGeo, lightFixtureMaterial);
        shade.position.set(0, wallHeight + roofHeight - 2.2, z);
        shade.userData = { type: 'fixture' };
        this.backgroundGroup.add(shade);

        const bulbGeo = new THREE.SphereGeometry(0.2);
        const bulb = new THREE.Mesh(bulbGeo, bulbMaterial);
        bulb.position.set(0, wallHeight + roofHeight - 2.3, z);
        bulb.userData = { type: 'bulb' };
        this.backgroundGroup.add(bulb);

        // Add actual Point Light for the bulb
        // We only add a few key lights to balance performance
        if (this.pendantLights.length < 4) {
          const bulbLight = new THREE.PointLight(0xFFD700, 0, 15); // Color, Initially 0 (set by theme), Distance
          bulbLight.position.set(0, wallHeight + roofHeight - 2.3, z); // Match bulb position
          bulbLight.castShadow = true;
          bulbLight.shadow.mapSize.set(512, 512); // Low res shadows for performance
          this.backgroundGroup.add(bulbLight);
          this.pendantLights.push(bulbLight);
        } else {
          // Just add a simpler light without shadows or skip
          const bulbLight = new THREE.PointLight(0xFFD700, 0, 10);
          bulbLight.position.set(0, wallHeight + roofHeight - 2.3, z);
          this.backgroundGroup.add(bulbLight);
          this.pendantLights.push(bulbLight);
        }
      } else if (Math.abs(z % (baySize * 2)) >= baySize && z < 20 && z > -35) {
        // Hanging Plants in bays without lights
        const cordGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.5);
        const cord = new THREE.Mesh(cordGeo, beamMaterial);
        cord.position.set(0, wallHeight + roofHeight - 0.75, z);
        this.backgroundGroup.add(cord);

        const plant = this.createDecorativePlant('fern');
        plant.position.set(0, wallHeight + roofHeight - 1.5, z);
        plant.scale.setScalar(1.2);
        plant.userData = { type: 'decorative' };
        plant.traverse(c => { if (c instanceof THREE.Mesh) { c.castShadow = true; c.receiveShadow = true; } });
        this.backgroundGroup.add(plant);
      }
    }

    // 2. Longitudinal Beams (Ridge, Eaves)
    const longBeamGeo = new THREE.BoxGeometry(0.3, 0.3, totalLength);
    const longBeamZ = (startZ + endZ) / 2;

    // Ridge (Peak)
    const ridge = new THREE.Mesh(longBeamGeo, beamMaterial);
    ridge.position.set(0, wallHeight + roofHeight, longBeamZ);
    ridge.userData = { type: 'beam' };
    ridge.castShadow = true;
    ridge.receiveShadow = true;
    this.backgroundGroup.add(ridge);

    // Eaves (Top of walls)
    const leftEave = new THREE.Mesh(longBeamGeo, beamMaterial);
    leftEave.position.set(-width / 2, wallHeight, longBeamZ);
    leftEave.userData = { type: 'beam' };
    leftEave.castShadow = true;
    leftEave.receiveShadow = true;
    this.backgroundGroup.add(leftEave);

    const rightEave = new THREE.Mesh(longBeamGeo, beamMaterial);
    rightEave.position.set(width / 2, wallHeight, longBeamZ);
    rightEave.userData = { type: 'beam' };
    rightEave.castShadow = true;
    rightEave.receiveShadow = true;
    this.backgroundGroup.add(rightEave);

    // Glass
    const roofPanelWidth = Math.sqrt(Math.pow(width / 2, 2) + Math.pow(roofHeight, 2));
    const roofSlopePanel = new THREE.BoxGeometry(roofPanelWidth, 0.05, totalLength);

    const leftGlass = new THREE.Mesh(roofSlopePanel, glassMaterial);
    leftGlass.position.set(-width / 4, wallHeight + roofHeight / 2, longBeamZ);
    leftGlass.rotation.z = rafterAngle;
    leftGlass.userData = { type: 'glass' };
    leftGlass.receiveShadow = true;
    this.backgroundGroup.add(leftGlass);

    const rightGlass = new THREE.Mesh(roofSlopePanel, glassMaterial);
    rightGlass.position.set(width / 4, wallHeight + roofHeight / 2, longBeamZ);
    rightGlass.rotation.z = -rafterAngle;
    rightGlass.userData = { type: 'glass' };
    rightGlass.receiveShadow = true;
    this.backgroundGroup.add(rightGlass);

    // Side Walls
    const wallPanelGeo = new THREE.BoxGeometry(0.05, wallHeight, totalLength);

    const leftWall = new THREE.Mesh(wallPanelGeo, glassMaterial);
    leftWall.position.set(-width / 2, wallHeight / 2, longBeamZ);
    leftWall.userData = { type: 'glass' };
    leftWall.receiveShadow = true;
    this.backgroundGroup.add(leftWall);

    const rightWall = new THREE.Mesh(wallPanelGeo, glassMaterial);
    rightWall.position.set(width / 2, wallHeight / 2, longBeamZ);
    rightWall.userData = { type: 'glass' };
    rightWall.receiveShadow = true;
    this.backgroundGroup.add(rightWall);

    // 3.5 Back Wall (Enclosure)
    const backWallPanelGeo = new THREE.BoxGeometry(width, wallHeight, 0.05);
    const backWall = new THREE.Mesh(backWallPanelGeo, glassMaterial);
    backWall.position.set(0, wallHeight / 2, endZ);
    backWall.userData = { type: 'glass' };
    backWall.receiveShadow = true;
    backWall.castShadow = true;
    this.backgroundGroup.add(backWall);

    // Back Roof Triangle (Gable)
    const backRoofTriangleGeo = new THREE.BufferGeometry();
    const triangleVertices = new Float32Array([
      -width / 2, wallHeight, endZ,
      width / 2, wallHeight, endZ,
      0, wallHeight + roofHeight, endZ
    ]);
    backRoofTriangleGeo.setAttribute('position', new THREE.BufferAttribute(triangleVertices, 3));
    backRoofTriangleGeo.computeVertexNormals();
    const backRoofTriangle = new THREE.Mesh(backRoofTriangleGeo, glassMaterial);
    backRoofTriangle.userData = { type: 'glass' };
    backRoofTriangle.receiveShadow = true;
    backRoofTriangle.castShadow = true;
    this.backgroundGroup.add(backRoofTriangle);

    // Back frame beams
    const backColLeft = new THREE.Mesh(colGeo, beamMaterial);
    backColLeft.position.set(-width / 2, wallHeight / 2, endZ);
    backColLeft.userData = { type: 'beam' };
    backColLeft.castShadow = true;
    this.backgroundGroup.add(backColLeft);

    const backColRight = new THREE.Mesh(colGeo, beamMaterial);
    backColRight.position.set(width / 2, wallHeight / 2, endZ);
    backColRight.userData = { type: 'beam' };
    backColRight.castShadow = true;
    this.backgroundGroup.add(backColRight);

    const backTie = new THREE.Mesh(tieGeo, beamMaterial);
    backTie.position.set(0, wallHeight, endZ);
    backTie.userData = { type: 'beam' };
    backTie.castShadow = true;
    this.backgroundGroup.add(backTie);

    const backLeftRafter = new THREE.Mesh(rafterGeo, beamMaterial);
    backLeftRafter.position.set(-width / 4, wallHeight + roofHeight / 2, endZ);
    backLeftRafter.rotation.z = rafterAngle;
    backLeftRafter.userData = { type: 'beam' };
    backLeftRafter.castShadow = true;
    this.backgroundGroup.add(backLeftRafter);

    const backRightRafter = new THREE.Mesh(rafterGeo, beamMaterial);
    backRightRafter.position.set(width / 4, wallHeight + roofHeight / 2, endZ);
    backRightRafter.rotation.z = -rafterAngle;
    backRightRafter.userData = { type: 'beam' };
    backRightRafter.castShadow = true;
    this.backgroundGroup.add(backRightRafter);

    // 4. Central Path
    // IMPORTANT: Path must lie ON TOP of the floor.
    // Floor is at y = -0.5. Path should be slightly higher.
    const pathGeo = new THREE.PlaneGeometry(pathWidth, totalLength);
    const path = new THREE.Mesh(pathGeo, pathMaterial);
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, -0.48, longBeamZ); // Just above floor y=-0.5
    path.userData = { type: 'path' };
    this.backgroundGroup.add(path);

    // 5. Side Benches
    const benchHeight = 0.8; // Relative to 0 (which is above floor)
    const benchWidth = 3;
    const benchZStart = startZ - 2;
    const benchZEnd = endZ + 2;
    // Pot material (clay)
    const potMaterial = new THREE.MeshStandardMaterial({ color: '#A0522D', roughness: 1.0 });

    // Left Bench
    const benchGeo = new THREE.BoxGeometry(benchWidth, 0.1, (benchZStart - benchZEnd));
    const leftBench = new THREE.Mesh(benchGeo, furnitureMaterial);
    leftBench.position.set(-width / 2 + benchWidth / 2 + 0.5, benchHeight, (benchZStart + benchZEnd) / 2);
    leftBench.userData = { type: 'furniture' };
    leftBench.castShadow = true;
    leftBench.receiveShadow = true;
    this.backgroundGroup.add(leftBench);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.15, benchHeight + 0.5, 0.15); // +0.5 to reach floor
    for (let z = benchZStart; z >= benchZEnd; z -= 5) {
      const lLeg1 = new THREE.Mesh(legGeo, beamMaterial);
      lLeg1.position.set(-width / 2 + 0.5 + 0.2, benchHeight / 2 - 0.25, z);
      lLeg1.userData = { type: 'beam' };
      this.backgroundGroup.add(lLeg1);

      const lLeg2 = new THREE.Mesh(legGeo, beamMaterial);
      lLeg2.position.set(-width / 2 + benchWidth + 0.3, benchHeight / 2 - 0.25, z);
      lLeg2.userData = { type: 'beam' };
      lLeg2.castShadow = true;
      lLeg2.receiveShadow = true;
      this.backgroundGroup.add(lLeg2);

      // Left Bench Plants - Increased Density
      const numPlantsL = Math.floor(Math.random() * 4) + 2; // 2 to 5 plants per section
      for (let i = 0; i < numPlantsL; i++) {
        const types: ('fern' | 'succulent' | 'tree' | 'bush')[] = ['fern', 'succulent', 'tree', 'bush'];
        const type = types[Math.floor(Math.random() * types.length)];
        const plant = this.createDecorativePlant(type);

        const baseX = -width / 2 + benchWidth / 2 + 0.5;
        const zOffset = (Math.random() * 4) - 2;
        const xOffset = (Math.random() - 0.5) * 1.5;

        plant.position.set(baseX + xOffset, benchHeight + 0.1, z + zOffset);
        plant.rotation.y = Math.random() * Math.PI * 2;
        const scale = 0.8 + Math.random() * 0.4;
        plant.scale.setScalar(scale);

        plant.userData = { type: 'decorative' };
        plant.traverse(c => { if (c instanceof THREE.Mesh) { c.castShadow = true; c.receiveShadow = true; } });
        this.backgroundGroup.add(plant);
      }
    }

    // Right Bench
    const rightBench = new THREE.Mesh(benchGeo, furnitureMaterial);
    rightBench.position.set(width / 2 - benchWidth / 2 - 0.5, benchHeight, (benchZStart + benchZEnd) / 2);
    rightBench.userData = { type: 'furniture' };
    rightBench.castShadow = true;
    rightBench.receiveShadow = true;
    this.backgroundGroup.add(rightBench);

    // Right Legs
    for (let z = benchZStart; z >= benchZEnd; z -= 5) {
      const rLeg1 = new THREE.Mesh(legGeo, beamMaterial);
      rLeg1.position.set(width / 2 - 0.5 - 0.2, benchHeight / 2 - 0.25, z);
      rLeg1.userData = { type: 'beam' };
      this.backgroundGroup.add(rLeg1);

      const rLeg2 = new THREE.Mesh(legGeo, beamMaterial);
      rLeg2.position.set(width / 2 - benchWidth - 0.3, benchHeight / 2 - 0.25, z);
      rLeg2.userData = { type: 'beam' };
      rLeg2.castShadow = true;
      rLeg2.receiveShadow = true;
      this.backgroundGroup.add(rLeg2);

      // Right Bench Plants - Increased Density
      const numPlantsR = Math.floor(Math.random() * 4) + 2; // 2 to 5 plants per section
      for (let i = 0; i < numPlantsR; i++) {
        const types: ('fern' | 'succulent' | 'tree' | 'bush')[] = ['fern', 'succulent', 'tree', 'bush'];
        const type = types[Math.floor(Math.random() * types.length)];
        const plant = this.createDecorativePlant(type);

        const baseX = width / 2 - benchWidth / 2 - 0.5;
        const zOffset = (Math.random() * 4) - 2;
        const xOffset = (Math.random() - 0.5) * 1.5;

        plant.position.set(baseX + xOffset, benchHeight + 0.1, z + zOffset);
        plant.rotation.y = Math.random() * Math.PI * 2;
        const scale = 0.8 + Math.random() * 0.4;
        plant.scale.setScalar(scale);

        plant.userData = { type: 'decorative' };
        plant.traverse(c => { if (c instanceof THREE.Mesh) { c.castShadow = true; c.receiveShadow = true; } });
        this.backgroundGroup.add(plant);
      }
    }

    // 6. Scattered Ground Vegetation (Wild plants sticking out the ground)
    const numGroundPlants = 60;
    const groundPlantTypes: ('grass' | 'fern' | 'bush' | 'stalk' | 'flower')[] = ['grass', 'fern', 'bush', 'stalk', 'flower'];

    for (let i = 0; i < numGroundPlants; i++) {
      const type = groundPlantTypes[Math.floor(Math.random() * groundPlantTypes.length)];
      const plant = this.createGroundPlant(type);

      // Randomize position within greenhouse bounds, avoiding the central path
      let gx: number, gz: number;
      const onLeft = Math.random() > 0.5;

      if (onLeft) {
        gx = -width / 2 + 1 + Math.random() * (width / 2 - pathWidth / 2 - 1.5);
      } else {
        gx = pathWidth / 2 + 0.5 + Math.random() * (width / 2 - pathWidth / 2 - 1.5);
      }

      gz = endZ + 1 + Math.random() * (totalLength - 2);

      plant.position.set(gx, -0.48, gz); // Slightly above floor
      plant.rotation.y = Math.random() * Math.PI * 2;
      plant.scale.setScalar(0.7 + Math.random() * 0.8);
      plant.userData = { type: 'decorative' };
      this.backgroundGroup.add(plant);
    }

    // --- External Environment ---

    // 1. External Ground (Forest Floor)
    // Sits slightly below internal floor to avoid z-fighting at edges
    const extGroundGeo = new THREE.CircleGeometry(120, 32);
    const extGroundMat = new THREE.MeshStandardMaterial({ color: '#3A5A3A', roughness: 1.0 });
    const extGround = new THREE.Mesh(extGroundGeo, extGroundMat);
    extGround.rotation.x = -Math.PI / 2;
    extGround.position.y = -2.0;
    extGround.userData = { type: 'externalGround' };
    this.backgroundGroup.add(extGround);

    // 2. Forest Skirt (Trees surrounding greenhouse)
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#2A1A0A', roughness: 0.9 });
    const leavesMat = new THREE.MeshStandardMaterial({ color: '#1E3F1E', roughness: 0.8 });

    // Greenhouse footprint (approx): x:[-12, 12], z:[-40, 20]
    // We define an exclusion zone with padding
    const minExclX = -18;
    const maxExclX = 18;
    const minExclZ = -41; // Trees start right after back wall
    const maxExclZ = 25;

    // Generate trees via rejection sampling
    let treesPlaced = 0;

    while (treesPlaced < 300) {
      // Generate random point in a large area around the greenhouse
      // Area: x:[-80, 80], z:[-100, 60]
      const tx = (Math.random() - 0.5) * 160;
      const tz = (Math.random() - 0.5) * 160 - 10; // Bias slightly to match center

      // Check if inside exclusion zone
      if (tx > minExclX && tx < maxExclX && tz > minExclZ && tz < maxExclZ) {
        continue; // Skip this position
      }

      // Place tree
      const scale = 0.8 + Math.random() * 1.5;

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * scale, 0.5 * scale, 8 * scale), trunkMat);
      trunk.position.set(tx, 4 * scale - 2, tz); // Grounded at y=-2
      trunk.userData = { type: 'forest_trunk' };
      this.backgroundGroup.add(trunk);

      // Foliage (Low poly cone)
      const leaves = new THREE.Mesh(new THREE.ConeGeometry(2.5 * scale, 9 * scale, 8), leavesMat);
      leaves.position.set(tx, 8 * scale, tz);
      leaves.userData = { type: 'forest_leaves' };
      this.backgroundGroup.add(leaves);

      treesPlaced++;
    }
  }

  private createForestBackground() {
    if (!this.backgroundGroup) return;

    // 1. Forest Floor (sits just below plants)
    const floorGeo = new THREE.PlaneGeometry(100, 100);
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#2D3F2D',
      roughness: 1.0,
      metalness: 0
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.51; // Just below standard floor
    floor.receiveShadow = true;
    this.backgroundGroup.add(floor);

    // 2. Mossy Rocks & Boulders
    const rockMat = new THREE.MeshStandardMaterial({ color: '#4A4A4A', roughness: 0.9, metalness: 0 });
    const mossMat = new THREE.MeshStandardMaterial({ color: '#3A5A3A', roughness: 1.0 });

    for (let i = 0; i < 40; i++) {
      const rockGroup = new THREE.Group();
      const rx = (Math.random() - 0.5) * 60;
      const rz = (Math.random() * 60) - 30;

      let scale = 0.5 + Math.random() * 2.0;
      // Shrink rocks that are very close to the camera (high rz) to avoid blocking the view
      if (rz > 15) scale *= 0.4;
      else if (rz > 5) scale *= 0.7;

      const rockGeo = new THREE.DodecahedronGeometry(scale, 0);
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.scale.y *= 0.6; // Flatten slightly
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rockGroup.add(rock);

      // Simple moss patch on top
      if (Math.random() > 0.4) {
        const moss = new THREE.Mesh(new THREE.SphereGeometry(scale * 0.8, 8, 8), mossMat);
        moss.position.y = scale * 0.3;
        moss.scale.y = 0.5;
        rockGroup.add(moss);
      }

      rockGroup.position.set(rx, -0.6, rz);
      rockGroup.userData = { type: 'foliage' };
      this.backgroundGroup.add(rockGroup);
    }

    // 3. Dense Forest Thicket
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: '#2A1A0A', roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: '#1E3F1E', roughness: 0.8, transparent: true, opacity: 0.9 });

    for (let i = 0; i < 150; i++) {
      const x = (Math.random() - 0.5) * 80;
      const z = (Math.random() * 80) - 40;

      // Skip a corridor for the central path area
      if (Math.abs(x) < 6) continue;

      const scale = 0.8 + Math.random() * 2.5;
      const trunkGeo = new THREE.CylinderGeometry(0.3 * scale, 0.5 * scale, 25 * scale, 8);
      const trunk = new THREE.Mesh(trunkGeo, trunkMaterial);
      trunk.position.set(x, 12 * scale - 0.5, z);
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      trunk.userData = { type: 'forest_trunk' };
      this.backgroundGroup.add(trunk);

      // Low branches/foliage - Enhanced with multiple layers
      if (Math.random() > 0.3) {
        const layers = 2 + Math.floor(Math.random() * 3);
        const foliageGroup = new THREE.Group();
        foliageGroup.position.set(x, 0, z);

        for (let j = 0; j < layers; j++) {
          const leafGeo = new THREE.ConeGeometry(2 * scale * (1 - j * 0.2), 6 * scale, 8);
          const foliage = new THREE.Mesh(leafGeo, leafMat);
          foliage.position.y = 8 * scale + (j * 3 * scale);
          foliage.rotation.y = (j * Math.PI) / 4;
          foliage.userData = { type: 'forest_leaves' };
          foliageGroup.add(foliage);
        }
        this.backgroundGroup.add(foliageGroup);
      }
    }

    // 3.5 Sunlight Rays (God Rays)
    const rayMaterial = new THREE.MeshBasicMaterial({
      color: '#FFF9E5',
      transparent: true,
      opacity: 0.05,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    for (let i = 0; i < 12; i++) {
      const rayGeo = new THREE.CylinderGeometry(0.5, 4, 40, 8, 1, true);
      const ray = new THREE.Mesh(rayGeo, rayMaterial);

      const rx = (Math.random() - 0.5) * 60;
      const rz = (Math.random() * 60) - 30;

      ray.position.set(rx, 20, rz);
      ray.rotation.x = Math.PI / 6; // Slanted light
      ray.rotation.z = (Math.random() - 0.5) * 0.5;

      this.backgroundGroup.add(ray);
    }

    // 4. Ground Vegetation (Ferns & Grass patches)
    for (let i = 0; i < 80; i++) {
      const type = Math.random() > 0.3 ? 'fern' : 'bush';
      const plant = this.createGroundPlant(type);
      const px = (Math.random() - 0.5) * 60;
      const pz = (Math.random() * 60) - 30;

      if (Math.abs(px) < 4) continue;

      plant.position.set(px, -0.5, pz);
      plant.rotation.y = Math.random() * Math.PI * 2;
      plant.scale.setScalar(0.6 + Math.random() * 1.0);
      plant.userData = { type: 'foliage' };
      this.backgroundGroup.add(plant);
    }
  }

  private createGardenBackground() {
    if (!this.backgroundGroup) return;

    // Tiled Floor - Large off-white concrete surface
    const floorGeo = new THREE.PlaneGeometry(100, 100);
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#E8E4D8', // Off-white concrete
      roughness: 0.8,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.5;
    floor.receiveShadow = true;
    this.backgroundGroup.add(floor);

    // Grid Pattern / Grout Lines
    const groutMat = new THREE.MeshStandardMaterial({ color: '#1A1A1A', transparent: true, opacity: 0.8 });
    const gridSize = 2; // 2x2 meter tiles (Increased density)
    for (let i = -12; i <= 12; i++) {
      // Horizontal lines
      const hLine = new THREE.Mesh(new THREE.PlaneGeometry(100, 0.05), groutMat);
      hLine.rotation.x = -Math.PI / 2;
      hLine.position.set(0, -0.495, i * gridSize);
      this.backgroundGroup.add(hLine);

      // Vertical lines
      const vLine = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 100), groutMat);
      vLine.rotation.x = -Math.PI / 2;
      vLine.position.set(i * gridSize, -0.495, 0);
      this.backgroundGroup.add(vLine);
    }

    // Modular Hedges with Arches - Leafy texture simulation
    const hedgeMat = new THREE.MeshStandardMaterial({
      color: '#2A4A2A',
      roughness: 1.0,
      metalness: 0,
      emissive: '#0A1A0A',
      emissiveIntensity: 0.1
    });

    // Simple procedural-like noise for leafiness (using small boxes)
    const addHedgeDetail = (parent: THREE.Object3D, width: number, height: number, depth: number, skipCenter: boolean = false) => {
      const detailCount = Math.floor(width * height * 8.0); // Significantly denser (was 2.5)
      const detailGeo = new THREE.BoxGeometry(0.5, 0.5, 0.1);
      for (let i = 0; i < detailCount; i++) {
        const lx = (Math.random() - 0.5) * width;
        const ly = (Math.random() * height) - height / 2 + 3.5;

        // If it's an arch segment, skip placing leaves in the door opening
        // Opening is roughly x:[-2, 2], y:[0, 6]
        if (skipCenter && Math.abs(lx) < 2.5 && ly < 7.5) {
          continue;
        }

        const leaf = new THREE.Mesh(detailGeo, hedgeMat);
        leaf.position.set(lx, ly, (Math.random() > 0.5 ? 1 : -1) * (depth / 2 + 0.1));
        leaf.rotation.set(Math.random(), Math.random(), Math.random());
        leaf.scale.setScalar(0.3 + Math.random() * 0.3); // Smaller, more consistent leaves for density
        parent.add(leaf);
      }
    };

    const createHedgeSegment = (x: number, z: number, rotationY: number, hasArch: boolean = false) => {
      const segment = new THREE.Group();

      if (hasArch) {
        // Taller, more elegant side pillars
        const sidePillarGeo = new THREE.BoxGeometry(4, 10, 3);
        const leftPillar = new THREE.Mesh(sidePillarGeo, hedgeMat);
        leftPillar.position.set(-4, 4.5, 0);
        segment.add(leftPillar);

        const rightPillar = new THREE.Mesh(sidePillarGeo, hedgeMat);
        rightPillar.position.set(4, 4.5, 0);
        segment.add(rightPillar);

        // Top part above arch - reduced height to make room for smoother arch
        const topGeo = new THREE.BoxGeometry(4, 2.5, 3);
        const topPart = new THREE.Mesh(topGeo, hedgeMat);
        topPart.position.set(0, 8.25, 0);
        segment.add(topPart);

        // Perfectly semicircular arched top (smoother)
        const archTopGeo = new THREE.CylinderGeometry(2, 2, 3, 32, 1, false, 0, Math.PI);
        const archTop = new THREE.Mesh(archTopGeo, hedgeMat);
        archTop.rotation.z = Math.PI / 2;
        archTop.rotation.y = Math.PI / 2;
        archTop.position.set(0, 7, 0);
        segment.add(archTop);

        // Add leaf details to arch pillars (skipping the middle)
        addHedgeDetail(segment, 12, 10, 3.2, true);
      } else {
        const wallGeo = new THREE.BoxGeometry(12, 8, 3);
        const wall = new THREE.Mesh(wallGeo, hedgeMat);
        wall.position.y = 3.5;
        segment.add(wall);
        addHedgeDetail(segment, 12, 8, 3);
      }

      segment.position.set(x, 0, z);
      segment.rotation.y = rotationY;
      segment.userData = { type: 'foliage' };
      this.backgroundGroup?.add(segment);
    };

    // Back Hedge Wall
    createHedgeSegment(0, -10, 0, true);
    createHedgeSegment(-12, -10, 0, false);
    createHedgeSegment(12, -10, 0, false);
    createHedgeSegment(-24, -10, 0, false);
    createHedgeSegment(24, -10, 0, false);

    // Left Hedge Wall
    createHedgeSegment(-15, 0, Math.PI / 2, true);
    createHedgeSegment(-15, 12, Math.PI / 2, false);
    createHedgeSegment(-15, -12, Math.PI / 2, false);

    // Right Hedge Wall
    createHedgeSegment(15, 0, -Math.PI / 2, true);
    createHedgeSegment(15, 12, -Math.PI / 2, false);
    createHedgeSegment(15, -12, -Math.PI / 2, false);

    // Raised Stone Beds
    const stoneMat = new THREE.MeshStandardMaterial({
      color: '#E8DCC0',
      roughness: 0.6,
      metalness: 0.1,
      emissive: '#222211',
      emissiveIntensity: 0.1
    });

    const addBedDetail = (parent: THREE.Object3D, width: number, length: number) => {
      // Add stone joint lines
      const jointMat = new THREE.MeshStandardMaterial({ color: '#A89470', transparent: true, opacity: 0.4 });
      for (let i = -width / 2 + 1; i < width / 2; i += 2) {
        const joint = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.8, 0.45), jointMat);
        joint.position.set(i, -0.1, length / 2 + 0.01);
        parent.add(joint);
      }
    };

    const dirtMat = new THREE.MeshStandardMaterial({ color: '#3D2B1F', roughness: 1.0 });

    const createRaisedBed = (x: number, z: number, width: number, length: number) => {
      const bed = new THREE.Group();

      // Walls
      const wallThickness = 0.4;
      const wallHeight = 0.8;

      const longWallGeo = new THREE.BoxGeometry(width, wallHeight, wallThickness);
      const shortWallGeo = new THREE.BoxGeometry(wallThickness, wallHeight, length);

      const frontWall = new THREE.Mesh(longWallGeo, stoneMat);
      frontWall.position.set(0, wallHeight / 2 - 0.5, length / 2);
      bed.add(frontWall);

      const backWall = new THREE.Mesh(longWallGeo, stoneMat);
      backWall.position.set(0, wallHeight / 2 - 0.5, -length / 2);
      bed.add(backWall);

      const leftWall = new THREE.Mesh(shortWallGeo, stoneMat);
      leftWall.position.set(-width / 2, wallHeight / 2 - 0.5, 0);
      bed.add(leftWall);

      const rightWall = new THREE.Mesh(shortWallGeo, stoneMat);
      rightWall.position.set(width / 2, wallHeight / 2 - 0.5, 0);
      bed.add(rightWall);

      // Top Lip
      const lipGeo = new THREE.BoxGeometry(width + 0.2, 0.1, wallThickness + 0.2);
      const sideLipGeo = new THREE.BoxGeometry(wallThickness + 0.2, 0.1, length + 0.2);

      const frontLip = new THREE.Mesh(lipGeo, stoneMat);
      frontLip.position.set(0, wallHeight - 0.5, length / 2);
      bed.add(frontLip);

      const backLip = new THREE.Mesh(lipGeo, stoneMat);
      backLip.position.set(0, wallHeight - 0.5, -length / 2);
      bed.add(backLip);

      const leftLip = new THREE.Mesh(sideLipGeo, stoneMat);
      leftLip.position.set(-width / 2, wallHeight - 0.5, 0);
      bed.add(leftLip);

      const rightLip = new THREE.Mesh(sideLipGeo, stoneMat);
      rightLip.position.set(width / 2, wallHeight - 0.5, 0);
      bed.add(rightLip);

      // Dirt
      const soil = new THREE.Mesh(new THREE.BoxGeometry(width - 0.2, 0.5, length - 0.2), dirtMat);
      soil.position.y = 0.2 - 0.5;
      bed.add(soil);

      addBedDetail(bed, width, length);

      // Add Lavender/Bushes in the bed
      for (let i = 0; i < 25; i++) {
        const plant = this.createGroundPlant(Math.random() > 0.4 ? 'stalk' : 'flower'); // More stalks for lavender feel
        if (plant.userData.type === 'stalk') {
          // Tint stalks purple for lavender
          plant.traverse(c => {
            if (c instanceof THREE.Mesh && c.material instanceof THREE.MeshStandardMaterial) {
              c.material.color.set('#9A7EBF'); // Lavender purple
            }
          });
        }
        plant.position.set(
          (Math.random() - 0.5) * (width - 1),
          wallHeight - 0.5,
          (Math.random() - 0.5) * (length - 1)
        );
        plant.scale.setScalar(0.5 + Math.random() * 0.5);
        bed.add(plant);
      }

      bed.position.set(x, 0, z);
      this.backgroundGroup?.add(bed);
    };

    createRaisedBed(-8, 5, 8, 15);
    createRaisedBed(8, 5, 8, 15);
    createRaisedBed(-8, -15, 8, 10);
    createRaisedBed(8, -15, 8, 10);

    // Classical Pillars with Urns
    const createPillar = (x: number, z: number) => {
      const pillar = new THREE.Group();

      const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1.2), stoneMat);
      base.position.y = -0.25;
      pillar.add(base);

      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 3.5, 8), stoneMat);
      shaft.position.y = 1.75;
      pillar.add(shaft);

      const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 1.2), stoneMat);
      top.position.y = 3.5;
      pillar.add(top);

      // Ornate Urn - Classical shape
      const urnPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.4, 16), stoneMat);
      urnPedestal.position.y = 3.9;
      pillar.add(urnPedestal);

      // Main body (lathe-like shape)
      const urnBodyGeo = new THREE.SphereGeometry(0.7, 16, 12);
      const urnBody = new THREE.Mesh(urnBodyGeo, stoneMat);
      urnBody.position.y = 4.6;
      urnBody.scale.y = 1.3;
      pillar.add(urnBody);

      // Flared rim
      const urnRim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.08, 12, 24), stoneMat);
      urnRim.rotation.x = Math.PI / 2;
      urnRim.position.y = 5.4;
      pillar.add(urnRim);

      pillar.position.set(x, 0, z);
      this.backgroundGroup?.add(pillar);
    };

    createPillar(-13, -8);
    createPillar(13, -8);
    createPillar(-13, 8);
    createPillar(13, 8);

    // Distant background hills silhouette
    const hillMat = new THREE.MeshStandardMaterial({ color: '#2A3A2A', roughness: 1.0 });
    for (let i = 0; i < 5; i++) {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), hillMat);
      hill.position.set((i - 2) * 60, -20, -100);
      hill.scale.y = 0.5;
      hill.scale.z = 0.2;
      this.backgroundGroup.add(hill);
    }
  }

  // --- HIGH FIDELITY FARM ASSETS ---

  private createDetailedFarm() {
    if (!this.backgroundGroup) return;

    // 1. Terrain & Grass System
    // Base Ground
    const groundGeo = new THREE.PlaneGeometry(200, 200, 48, 48);
    // Add subtle noise displacement for hills, but KEEP CENTER FLAT
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i); // This is Z in world space before rotation
      const z = pos.getZ(i); // This becomes height (Y)

      // Calculate distance from world center for plant clearing
      // Background is at Z=-15, and plane is rotated X=-90deg.
      // Plane Y (up in local space) points towards World -Z (away from camera).
      // So Local Y=+10 maps to World Z = -15 - 10 = -25.
      // Local Y=-10 maps to World Z = -15 - (-10) = -5.
      // The plants are at World Z = 0.
      // Local Y needed for World Z=0 is: -15. (-(-15) - 15 = 0).

      const worldZ = -y - 15;
      const distToPlantArea = Math.sqrt(x * x + worldZ * worldZ);

      // Mask: 0 at world center (where plants are), 1 at dist > 15
      const mask = Math.min(1, Math.max(0, (distToPlantArea - 12) / 8));

      // Gentle rolling hills only away from plant area
      const height = (Math.sin(x * 0.05) * 1.5 + Math.cos(y * 0.05) * 1.5) * mask;
      pos.setZ(i, z + height);
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: '#2E4B28', // Darker base green
      roughness: 1.0,
      metalness: 0
    });
    const floor = new THREE.Mesh(groundGeo, groundMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.55; // Lower slightly to ensure pots sit ON it, not IN it (pots are at y~0 to -0.32)
    floor.receiveShadow = true;
    this.backgroundGroup.add(floor);

    // DENSE GRASS (Instances)
    const grassCount = 4000;
    const grassGeo = new THREE.ConeGeometry(0.1, 0.6, 3);
    const grassMat = new THREE.MeshStandardMaterial({ color: '#558B2F', roughness: 0.8 });
    const grassMesh = new THREE.InstancedMesh(grassGeo, grassMat, grassCount);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < grassCount; i++) {
      const x = (Math.random() - 0.5) * 160;
      const z = (Math.random() - 0.5) * 100 - 20;

      // Avoid center clearing for pots (Plants are at x~0, z=0..20 in world space)
      // Background z is at -15, so local z 15..35 matches world z 0..20
      if (Math.abs(x) < 10 && z > 10 && z < 40) continue;

      // Avoid path area roughly
      if (Math.abs(x) < 5 && z > 15) continue;

      // Calculate height match using same world-space logic
      const worldZ = z - 15;
      const distToPlantArea = Math.sqrt(x * x + worldZ * worldZ);
      const mask = Math.min(1, Math.max(0, (distToPlantArea - 12) / 8));
      const h = (Math.sin(x * 0.05) * 1.5 + Math.cos(z * 0.05) * 1.5) * mask;

      dummy.position.set(x, -0.55 + h, z); // Match floor height
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.rotation.z = (Math.random() - 0.5) * 0.2;

      const scale = 0.8 + Math.random() * 0.8;
      dummy.scale.set(scale, scale * (1 + Math.random()), scale);

      dummy.updateMatrix();
      grassMesh.setMatrixAt(i, dummy.matrix);
    }
    grassMesh.receiveShadow = true;
    grassMesh.castShadow = true;
    this.backgroundGroup.add(grassMesh);

    // Path (Winding)
    // Using a tube or strip for smoother look
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(2, 0, 30),
      new THREE.Vector3(-1, 0, 10),
      new THREE.Vector3(1, 0, -20),
      new THREE.Vector3(-4, 0, -60),
    ]);
    const pathGeo = new THREE.TubeGeometry(curve, 32, 2.5, 8, false); // Smaller radius
    const pathMat = new THREE.MeshStandardMaterial({ color: '#5D4037', roughness: 1.0 });
    const path = new THREE.Mesh(pathGeo, pathMat);
    // FLATTEN THE TUBE to make a path strip
    path.scale.set(1, 0.02, 1);
    path.position.y = -0.52; // Slightly above floor (-0.55)
    path.receiveShadow = true;
    this.backgroundGroup.add(path);


    // 2. Structures

    // RED BARN (Detailed)
    const barnGroup = new THREE.Group();
    const barnRed = new THREE.MeshStandardMaterial({ color: '#8f2323', roughness: 0.7 });
    const trimWhite = new THREE.MeshStandardMaterial({ color: '#DDDDDD' });
    const roofTin = new THREE.MeshStandardMaterial({ color: '#708090', roughness: 0.5, metalness: 0.2 });

    // Main Box
    const bBody = new THREE.Mesh(new THREE.BoxGeometry(22, 16, 30), barnRed);
    bBody.position.y = 8;
    bBody.castShadow = true;
    bBody.receiveShadow = true;
    barnGroup.add(bBody);

    // Roof (Gambrel - Constructed)
    const roofGroup = new THREE.Group();
    // Top slope
    const rTop = new THREE.Mesh(new THREE.BoxGeometry(14, 1, 32), roofTin);
    rTop.position.y = 22;
    roofGroup.add(rTop);
    // Side slopes
    const rLeft = new THREE.Mesh(new THREE.BoxGeometry(8, 0.8, 32), roofTin);
    rLeft.position.set(-9, 19, 0);
    rLeft.rotation.z = Math.PI / 4;
    roofGroup.add(rLeft);
    const rRight = new THREE.Mesh(new THREE.BoxGeometry(8, 0.8, 32), roofTin);
    rRight.position.set(9, 19, 0);
    rRight.rotation.z = -Math.PI / 4;
    roofGroup.add(rRight);

    barnGroup.add(roofGroup);

    // Barn Door & Trim
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(10, 12, 1), trimWhite);
    doorFrame.position.set(0, 6, 15.1);
    barnGroup.add(doorFrame);
    const door = new THREE.Mesh(new THREE.BoxGeometry(8, 10, 1), barnRed);
    door.position.set(0, 6, 15.2);
    // X Brace
    const brace1 = new THREE.Mesh(new THREE.BoxGeometry(9, 0.8, 0.2), trimWhite);
    brace1.rotation.z = 0.7;
    brace1.position.z = 0.6;
    door.add(brace1);
    const brace2 = new THREE.Mesh(new THREE.BoxGeometry(9, 0.8, 0.2), trimWhite);
    brace2.rotation.z = -0.7;
    brace2.position.z = 0.6;
    door.add(brace2);

    barnGroup.add(door);

    barnGroup.position.set(-35, 0, -30);
    barnGroup.rotation.y = Math.PI / 6;
    this.backgroundGroup.add(barnGroup);


    // FARM HOUSE (Detailed)
    const houseGroup = new THREE.Group();
    const sidingMat = new THREE.MeshStandardMaterial({ color: '#E8E4DC', roughness: 0.9 }); // White siding
    const porchMat = new THREE.MeshStandardMaterial({ color: '#6D4C41' }); // Dark wood

    // Main
    const hBody = new THREE.Mesh(new THREE.BoxGeometry(20, 14, 16), sidingMat);
    hBody.position.y = 7;
    hBody.castShadow = true;
    hBody.receiveShadow = true;
    houseGroup.add(hBody);

    // Roof
    const hRoof = new THREE.Mesh(new THREE.ConeGeometry(17, 8, 4, 1, false, Math.PI / 4), roofTin);
    hRoof.position.y = 14 + 4;
    hRoof.scale.set(1, 1, 1.4);
    houseGroup.add(hRoof);

    // Porch
    const pDeck = new THREE.Mesh(new THREE.BoxGeometry(20, 1, 6), porchMat);
    pDeck.position.set(0, 1, 10);
    houseGroup.add(pDeck);

    const pRoof = new THREE.Mesh(new THREE.BoxGeometry(21, 0.5, 7), roofTin);
    pRoof.position.set(0, 8, 10);
    pRoof.rotation.x = 0.05;
    houseGroup.add(pRoof);

    // Columns
    for (let x of [-9, -4, 4, 9]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.8, 7, 0.8), trimWhite);
      col.position.set(x, 4.5, 12);
      houseGroup.add(col);
    }

    // Windows
    const winGeo = new THREE.PlaneGeometry(3, 5);
    const winMat = new THREE.MeshStandardMaterial({ color: '#2b2b2b', roughness: 0.2 });
    const w1 = new THREE.Mesh(winGeo, winMat); w1.position.set(-5, 9, 8.1); houseGroup.add(w1);
    const w2 = new THREE.Mesh(winGeo, winMat); w2.position.set(5, 9, 8.1); houseGroup.add(w2);

    houseGroup.position.set(40, 0, -20);
    houseGroup.rotation.y = -Math.PI / 8;
    this.backgroundGroup.add(houseGroup);


    // 3. Vegetation - High Fidelity Trees
    const createTree = (x: number, z: number, scale: number) => {
      const tGroup = new THREE.Group();
      const bark = new THREE.MeshStandardMaterial({ color: '#3E2723', roughness: 1 });
      const leaf = new THREE.MeshStandardMaterial({ color: '#33691E', roughness: 0.8 });

      // Trunk - Twisted cylinder
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 10, 8), bark);
      trunk.position.y = 5;
      trunk.castShadow = true;
      tGroup.add(trunk);

      // Branches
      const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 6), bark);
      b1.position.set(2, 8, 0); b1.rotation.z = -0.5; b1.castShadow = true; tGroup.add(b1);
      const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 6), bark);
      b2.position.set(-2, 9, 1); b2.rotation.z = 0.5; b2.castShadow = true; tGroup.add(b2);

      // Canopy - Cloud of scaled sphere instances or just many separate meshes? 
      // For performance, let's use a merged geometry or group of varied spheres.
      const foliagePos = [
        [0, 12, 0, 5], [3, 11, 2, 4], [-3, 11, -2, 4],
        [5, 9, 0, 3], [-4, 10, 3, 3.5], [0, 13, -3, 4]
      ];

      foliagePos.forEach(([fx, fy, fz, size]) => {
        // Rough sphere (low poly is fine for style, but needs volume)
        const f = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 1), leaf);
        f.position.set(fx, fy, fz);
        f.castShadow = true;
        // f.customDepthMaterial ... to ensure shadows are correct? Standard mat handles it.
        tGroup.add(f);
      });

      tGroup.position.set(x, 0, z);
      tGroup.scale.setScalar(scale);
      return tGroup;
    }

    // Hero Tree
    this.backgroundGroup.add(createTree(25, 10, 1.3)); // Right foreground
    this.backgroundGroup.add(createTree(-35, 15, 1.1)); // Left foreground
    this.backgroundGroup.add(createTree(0, -60, 1.5)); // Center BG


    // 4. Props (Hay & Crates)
    const hayMat = new THREE.MeshStandardMaterial({ color: '#FFD54F', roughness: 1 });
    const crateMat = new THREE.MeshStandardMaterial({ color: '#8D6E63', roughness: 1 });

    // Hay Bales (Round)
    for (let i = 0; i < 6; i++) {
      const bale = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2.5, 12), hayMat);
      bale.rotation.z = Math.PI / 2;
      bale.rotation.y = Math.random() * Math.PI;
      bale.position.set(-15 + Math.random() * 10, 1.25, -5 + Math.random() * 15);
      bale.castShadow = true;
      this.backgroundGroup.add(bale);
    }

    // Crates Stack
    const crateGeo = new THREE.BoxGeometry(2, 2, 2);
    const c1 = new THREE.Mesh(crateGeo, crateMat); c1.position.set(15, 1, 5); c1.castShadow = true; this.backgroundGroup.add(c1);
    const c2 = new THREE.Mesh(crateGeo, crateMat); c2.position.set(17, 1, 4); c2.castShadow = true; c2.rotation.y = 0.2; this.backgroundGroup.add(c2);
    const c3 = new THREE.Mesh(crateGeo, crateMat); c3.position.set(16, 3, 4.5); c3.castShadow = true; c3.rotation.y = -0.1; this.backgroundGroup.add(c3);


    // 5. Horizontal Fences
    const fenceMat = new THREE.MeshStandardMaterial({ color: '#5D4037', roughness: 1 });
    // Left side fences
    for (let z = 0; z > -60; z -= 15) {
      // Post
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, 0.5), fenceMat);
      p.position.set(-10, 1.5, z); p.castShadow = true; this.backgroundGroup.add(p);
      // Cross rails
      const r1 = new THREE.Mesh(new THREE.BoxGeometry(20, 0.2, 0.2), fenceMat);
      r1.position.set(-20, 2, z); this.backgroundGroup.add(r1);
      const r2 = new THREE.Mesh(new THREE.BoxGeometry(20, 0.2, 0.2), fenceMat);
      r2.position.set(-20, 1.2, z); this.backgroundGroup.add(r2);
    }
    // Right side fences
    for (let z = 0; z > -60; z -= 15) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, 0.5), fenceMat);
      p.position.set(10, 1.5, z); p.castShadow = true; this.backgroundGroup.add(p);

      const r1 = new THREE.Mesh(new THREE.BoxGeometry(20, 0.2, 0.2), fenceMat);
      r1.position.set(20, 2, z); this.backgroundGroup.add(r1);
      const r2 = new THREE.Mesh(new THREE.BoxGeometry(20, 0.2, 0.2), fenceMat);
      r2.position.set(20, 1.2, z); this.backgroundGroup.add(r2);
    }


    // 6. Volumetric Rays (Sun Shafts)
    const rayGeo = new THREE.ConeGeometry(5, 40, 4, 1, true);
    const rayMat = new THREE.MeshBasicMaterial({
      color: '#FFD700',
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    for (let i = 0; i < 3; i++) {
      const ray = new THREE.Mesh(rayGeo, rayMat);
      ray.position.set(30 - i * 10, 15, -10 - i * 5);
      ray.rotation.x = Math.PI / 4;
      ray.rotation.z = -Math.PI / 6;
      this.backgroundGroup.add(ray);
    }

  }

  // Alias for backward compatibility or direct call
  private createFarmBackground() {
    this.createDetailedFarm();
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
    this.composer?.setSize(container.clientWidth, container.clientHeight);
  }

  setOnPlantClick(callback: (id: string) => void) {
    this.onPlantClick = callback;
  }

  // Interpolate between growth keyframes for smooth 30-stage morph targets
  private getGrowthState(growthStage: number): GrowthKeyframe {
    // Robustness check for invalid data
    if (typeof growthStage !== 'number' || isNaN(growthStage)) {
      growthStage = 1;
    }

    // Clamp growth stage to valid range
    const clampedStage = Math.max(0, Math.min(30, growthStage));
    const progress = clampedStage / 30; // 0 to 1

    // Map to 6 keyframes (0-5)
    const keyframeIndex = Math.min(Math.floor(progress * 5), 4);
    const nextKeyframeIndex = Math.min(keyframeIndex + 1, 5);
    const localProgress = (progress * 5) - keyframeIndex;

    // Safety check for array bounds
    const current = GROWTH_KEYFRAMES[keyframeIndex] || GROWTH_KEYFRAMES[0];
    const next = GROWTH_KEYFRAMES[nextKeyframeIndex] || GROWTH_KEYFRAMES[GROWTH_KEYFRAMES.length - 1];

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
      fog: true,
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
      fog: true,
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
    // Store materials for animation updates
    this.plantMaterials.set(group.uuid, materials);

    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return group;
  }

  // Track meshes that are animating out
  private dyingMeshes: THREE.Object3D[] = [];

  private getPlantPosition(index: number, totalPlants: number): { x: number, z: number } {
    let numRows = 1;
    if (totalPlants > 16) numRows = 3;
    else if (totalPlants > 7) numRows = 2;

    const baseStride = 2.5;
    const xStride = baseStride / (numRows === 1 ? 1 : numRows * 0.7);

    const rowIdx = index % numRows;
    const colIdx = Math.floor(index / numRows);

    const numCols = Math.ceil(totalPlants / numRows);
    const x = (colIdx - (numCols - 1) / 2) * xStride + (rowIdx % 2 === 1 ? xStride * 0.5 : 0);
    const z = rowIdx * 1.8;

    return { x, z };
  }

  updatePlants(plants: Plant[], selectedPlantId: string | null) {
    // Remove old plants - Transition them to dying state
    this.plants.forEach((plantMesh, id) => {
      if (!plants.find((p) => p.id === id)) {
        // Move to dying meshes for animation
        this.dyingMeshes.push(plantMesh);

        // Remove from active management maps
        this.plantIdMap.delete(plantMesh);
        this.plantMaterials.delete(plantMesh.uuid);
        this.plantData.delete(id);
        this.plants.delete(id);
      }
    });

    // Add/update plants
    plants.forEach((plant, index) => {
      const { x, z: zOffset } = this.getPlantPosition(index, plants.length);

      let plantMesh = this.plants.get(plant.id);
      const existingData = this.plantData.get(plant.id);

      // Recreate plant only if there are massive state jumps (e.g. initial load or debug hacks)
      // Small growth changes should use smooth uniform updates
      const needsRecreate = !plantMesh ||
        !existingData ||
        Math.abs(existingData.growthStage - plant.growthStage) > 5 ||
        // Always recreate if species changed (shouldn't happen for same ID but good safety)
        existingData.speciesId !== plant.speciesId;

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
      } else if (plantMesh) {
        // Update existing plant uniforms for smooth animation
        const growthState = this.getGrowthState(plant.growthStage);
        const materials = this.plantMaterials.get(plantMesh.uuid);

        if (materials) {
          materials.forEach(material => {
            if (material.uniforms) {
              // Smoothly interpolate uniforms
              if (material.uniforms.growthProgress)
                material.uniforms.growthProgress.value = growthState.scale;
              if (material.uniforms.unfurlAmount)
                material.uniforms.unfurlAmount.value = growthState.unfurlAmount;
              if (material.uniforms.droopAmount)
                material.uniforms.droopAmount.value = (1 - plant.health) * 0.8;
              if (material.uniforms.health)
                material.uniforms.health.value = plant.health;
            }
          });
        }

        // Update scaling for breathing effect - Find the inner plant group (not the root which includes pot)
        // Groups in creatingPlant: root -> [pot, rim, soil, plantGroup]
        // pot, rim, soil are Meshes. plantGroup is a Group.
        const plantModel = plantMesh.children.find(c => c.type === 'Group');
        if (plantModel) {
          plantModel.scale.setScalar(growthState.scale);
        }

        // Update data reference
        this.plantData.set(plant.id, {
          speciesId: plant.speciesId,
          growthStage: plant.growthStage,
          health: plant.health,
        });
      }

      plantMesh.position.set(x, 0, zOffset);

      // Selection highlight with smooth scaling
      const isSelected = selectedPlantId === plant.id;
      const targetScale = isSelected ? 1.08 : 1;
      // Since updatePlants is called from React useEffect, we can trust it handling state.
      // But we need to ensure we don't overwrite the growth scale with "1" from selection logic.
      // We should apply selection scale relative to growth scale.
      plantMesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    });

    // Update roots
    this.updateRoots(plants.length);
  }

  private updateDyingPlants() {
    for (let i = this.dyingMeshes.length - 1; i >= 0; i--) {
      const mesh = this.dyingMeshes[i];
      // Shrink to zero
      mesh.scale.lerp(new THREE.Vector3(0, 0, 0), 0.1);

      // Spin while shrinking
      mesh.rotation.y += 0.1;

      // If tiny, remove completely
      if (mesh.scale.x < 0.05) {
        this.scene.remove(mesh);
        // Deep dispose
        mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (child.material instanceof THREE.Material) {
              child.material.dispose();
            }
          }
        });
        this.dyingMeshes.splice(i, 1);
      }
    }
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
      const startPos = this.getPlantPosition(i, plantCount);
      const endPos = this.getPlantPosition(i + 1, plantCount);

      // Create organic root curve with more control points for animation
      const rootCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(startPos.x, -0.48, startPos.z),
        new THREE.Vector3(THREE.MathUtils.lerp(startPos.x, endPos.x, 0.2), -0.48, THREE.MathUtils.lerp(startPos.z, endPos.z, 0.2) + 0.15 * Math.sin(i)),
        new THREE.Vector3(THREE.MathUtils.lerp(startPos.x, endPos.x, 0.4), -0.48, THREE.MathUtils.lerp(startPos.z, endPos.z, 0.4) - 0.1 * Math.cos(i)),
        new THREE.Vector3(THREE.MathUtils.lerp(startPos.x, endPos.x, 0.5), -0.48, THREE.MathUtils.lerp(startPos.z, endPos.z, 0.5) + 0.12 * Math.sin(i * 1.5)),
        new THREE.Vector3(THREE.MathUtils.lerp(startPos.x, endPos.x, 0.7), -0.48, THREE.MathUtils.lerp(startPos.z, endPos.z, 0.7) - 0.08 * Math.cos(i * 2)),
        new THREE.Vector3(THREE.MathUtils.lerp(startPos.x, endPos.x, 0.8), -0.48, THREE.MathUtils.lerp(startPos.z, endPos.z, 0.8) + 0.05 * Math.sin(i * 2)),
        new THREE.Vector3(endPos.x, -0.48, endPos.z),
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
        const t = 0.2 + (b / branchCount) * 0.6; // Interpolate along the root segment
        const branchStartX = THREE.MathUtils.lerp(startPos.x, endPos.x, t);
        const branchStartZ = THREE.MathUtils.lerp(startPos.z, endPos.z, t);

        const branchCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(branchStartX, -0.48, branchStartZ),
          new THREE.Vector3(branchStartX + 0.2, -0.48, branchStartZ + 0.2 * (b % 2 === 0 ? 1 : -1)),
          new THREE.Vector3(branchStartX + 0.4, -0.48, branchStartZ + 0.3 * (b % 2 === 0 ? 1 : -1)),
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
        // Dynamic camera position based on plant's actual Z position in the scene
        const offsetZ = 2.0; // Closer zoom
        this.cameraEndPosition.set(plantMesh.position.x, 1.2, plantMesh.position.z + offsetZ); // Lower camera height
        // Look slightly below the plant base to shift the plant UP in the viewport (to avoid modal occlusion)
        this.cameraEndLookAt.set(plantMesh.position.x, -0.2, plantMesh.position.z);
        this.targetDofStrength = 1.0; // Enable DoF
        this.focusDistance = offsetZ;
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
      // Calculate distance from the focal plane (which is offsetZ away from camera when inspecting)
      // When not inspecting, focusDistance is 0, so DofStrength should be 0 anyway.
      // But let's map it correctly:
      const distToCamera = this.camera.position.distanceTo(plant.position);
      const distFromFocus = Math.abs(distToCamera - this.focusDistance);

      const blur = Math.min(1, distFromFocus * 0.3) * this.dofStrength;

      // Scale down slightly for blur simulation
      const targetScale = 1 - blur * 0.05;
      plant.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    });
  }

  updateLighting(mode: 'golden' | 'twilight') {
    if (!this.directionalLight) return;

    // Color Shift - Neutralize Twilight Blue
    const targetColor = mode === 'golden' ? new THREE.Color('#FFD700') : new THREE.Color('#333333');
    this.directionalLight.color.lerp(targetColor, 0.02);

    // Solar Movement (Shadow Shift)
    const targetX = mode === 'golden' ? 5 : -5;
    this.directionalLight.position.x += (targetX - this.directionalLight.position.x) * 0.01;

    // Sparkles Visibility
    if (this.sparkles && this.sparkles.material instanceof THREE.PointsMaterial) {
      const targetOpacity = mode === 'golden' ? 0.6 : 0;
      this.sparkles.material.opacity += (targetOpacity - this.sparkles.material.opacity) * 0.02;
    }
  }

  updateTheme(mode: 'dark' | 'light') {
    this.currentTheme = mode;
    this.applyEnvironmentColors();
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);

    // Tick the growth animation system
    useGardenStore.getState().updateGrowthAnimation();

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

    // Animate Sparkles (Dust Motes)
    if (this.sparkles) {
      this.sparkles.rotation.y = time * 0.01; // Slower rotation
      this.sparkles.rotation.z = time * 0.005;
      const positions = this.sparkles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length / 3; i++) {
        // Fluid, drifting motion for dust
        positions[i * 3 + 1] += Math.sin(time * 0.2 + positions[i * 3]) * 0.001; // Slower rise/fall
        positions[i * 3] += Math.cos(time * 0.15 + i) * 0.0005; // Gentle drifting
      }
      this.sparkles.geometry.attributes.position.needsUpdate = true;
    }

    // Stable intensity in dark mode for pendant lights
    if (this.currentTheme === 'dark' && this.pendantLights.length > 0) {
      this.pendantLights.forEach((light) => {
        light.intensity = 0.8;
      });
    }

    // Animate dying plants (shrink and remove)
    this.updateDyingPlants();

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

    // Update Bloom based on gamification state & theme
    if (this.bloomPass) {
      const { lightingMode, streak } = useGardenStore.getState();
      const isHealthy = lightingMode === 'golden';

      // Theme-based base strength (Subtle for luxury feel)
      const baseStrength = this.currentTheme === 'dark' ? 0.6 : 0.3;
      const streakBurst = Math.min(streak * 0.03, 0.3);

      // Smoothly interpolate bloom parameters
      // Threshold kept high (0.95) to prevent sky/background bleed
      const targetStrength = (isHealthy ? 0.8 : 0.4) + baseStrength + streakBurst;
      const targetThreshold = 0.95;

      this.bloomPass.strength += (targetStrength - this.bloomPass.strength) * 0.05;
      this.bloomPass.threshold += (targetThreshold - this.bloomPass.threshold) * 0.05;
    }

    // Render using composer if available
    if (this.composer && this.performanceLevel === 'high') {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    this.monitorPerformance();
  };

  private monitorPerformance() {
    this.frameCount++;
    // The following lines were part of the instruction but appear to be misplaced or malformed.
    // Assuming the intent was to remove or modify a watering check elsewhere,
    // and not to insert unrelated logic into monitorPerformance.
    // const daysUntil = getDaysUntilWater();
    // // Allow watering if it's very close or needs water (button enablement handles the rest)
    // if (daysUntil > 0.01 && !needsWater) return;

    const currentTime = performance.now();

    if (currentTime - this.lastTime >= 1000) {
      const fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));



      // Degradation Logic
      // If FPS < 30 for consecutive checks, downgrade
      if (fps < 30) {
        this.lowFpsFrames++;
        if (this.lowFpsFrames > 3 && this.performanceLevel === 'high') {
          this.downgradeQuality();
        }
      } else {
        this.lowFpsFrames = 0;
      }

      this.frameCount = 0;
      this.lastTime = currentTime;
    }
  }

  private downgradeQuality() {
    console.warn('Performance degraded: Switching to Low Quality Mode');
    this.performanceLevel = 'low';
    this.renderer.setPixelRatio(1); // Force 1x pixel ratio


    // Reduce shadow map size?
    if (this.directionalLight) {
      this.directionalLight.shadow.map?.dispose();
      this.directionalLight.shadow.map = null;
      this.directionalLight.castShadow = false;
    }
  }

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
  private createProceduralGroundTexture() {
    if (this.groundTexture) return this.groundTexture;

    const size = 512; // Increased resolution
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Base concrete/stone color (Light Grey)
      ctx.fillStyle = '#C0C0C0';
      ctx.fillRect(0, 0, size, size);

      // Add noise layers for texture
      for (let i = 0; i < 20000; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const grey = Math.random() * 60 + 160; // Lighter/Subtle noise
        const alpha = Math.random() * 0.2;
        ctx.fillStyle = `rgba(${grey}, ${grey}, ${grey}, ${alpha})`;
        ctx.fillRect(x, y, 1, 1);
      }

      // Add subtle splotches (Weathering)
      for (let i = 0; i < 50; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const radius = Math.random() * 60 + 20;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);

        const r = 140, g = 140, b = 140; // Neutral dark grey weathering
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.3)`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }

      // Add subtle "joint" lines for tiles/sections
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= size; i += size / 2) {
        ctx.beginPath();
        ctx.moveTo(i, 0); ctx.lineTo(i, size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i); ctx.lineTo(size, i);
        ctx.stroke();
      }
    }

    this.groundTexture = new THREE.CanvasTexture(canvas);
    this.groundTexture.wrapS = THREE.RepeatWrapping;
    this.groundTexture.wrapT = THREE.RepeatWrapping;
    this.groundTexture.repeat.set(10, 10); // More frequent tiles
    return this.groundTexture;
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
  const selectedBackground = useGardenStore((state) => state.selectedBackground);
  // const showFog = useGardenStore((state) => state.showFog);

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

    // Immediate hydration to prevent empty scene
    sceneManagerRef.current.updateTheme(useGardenStore.getState().themeMode);
    sceneManagerRef.current.updatePlants(
      useGardenStore.getState().plants,
      useGardenStore.getState().selectedPlantId
    );

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

  useEffect(() => {
    sceneManagerRef.current?.setBackground(selectedBackground);
  }, [selectedBackground]);

  return <div ref={containerRef} className="w-full h-full" />;
}
