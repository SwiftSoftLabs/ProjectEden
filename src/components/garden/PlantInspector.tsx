import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Droplets, Leaf, Calendar, TrendingUp, Sparkles, Heart, Clock, Award, ChevronLeft, ChevronRight, MoreVertical, Trash2, AlertTriangle } from 'lucide-react';
import { useGardenStore, PLANT_SPECIES } from '@/store/gardenStore';
import { useNotifications } from '@/hooks/useNotifications';
import { useLuxurySound } from '@/hooks/useLuxurySound';
import { useHaptics } from '@/hooks/useHaptics';
import { useClickOutside } from '@/hooks/useClickOutside';

interface PlantInspectorProps {
  plantId: string;
  onClose: () => void;
}

// Water particle type for collision system
interface WaterParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  hasCollided: boolean;
}

interface SplashParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export function PlantInspector({ plantId, onClose }: PlantInspectorProps) {
  // Store
  const plant = useGardenStore(state => state.plants.find(p => p.id === plantId));
  const waterPlant = useGardenStore(state => state.waterPlant);
  const removePlant = useGardenStore(state => state.removePlant);
  const getWateringSchedule = useGardenStore(state => state.getWateringSchedule);
  const themeMode = useGardenStore(state => state.themeMode);
  const modalRef = useRef<HTMLDivElement>(null);
  const deleteConfirmRef = useRef<HTMLDivElement>(null);

  // Hooks
  const { addNotification } = useNotifications();
  const { playWater, playChime } = useLuxurySound();
  const { triggerHaptic } = useHaptics();

  // Delete Flow State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useClickOutside(modalRef, () => {
    if (!showDeleteConfirm && !isMenuOpen) {
      onClose();
    }
  });

  useClickOutside(deleteConfirmRef, () => {
    if (showDeleteConfirm) {
      setShowDeleteConfirm(false);
    }
  });
  // State
  const [isWatering, setIsWatering] = useState(false);
  const [waterProgress, setWaterProgress] = useState(0);
  const [showGrowthEffect, setShowGrowthEffect] = useState(false);
  const [showBloomPulse, setShowBloomPulse] = useState(false);
  const [rippleActive, setRippleActive] = useState(false);
  const [ripplePosition, setRipplePosition] = useState({ x: 50, y: 50 });
  const [waterParticles, setWaterParticles] = useState<WaterParticle[]>([]);
  const [splashParticles, setSplashParticles] = useState<SplashParticle[]>([]);

  const [isHiddenForGrowth, setIsHiddenForGrowth] = useState(false);

  // Refs
  const particleIdRef = useRef(0);
  const waterIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const particleIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Lock ref to prevent double-firing (touch + mouse) within same render cycle
  const isWateringRef = useRef(false);

  // Derived
  const species = plant ? PLANT_SPECIES.find(s => s.id === plant.speciesId) : null;
  const isDark = themeMode === 'dark';



  const handleDelete = () => {
    if (plant) {
      removePlant(plantId);
      addNotification({
        id: Date.now().toString(),
        title: 'Plant Removed',
        message: `${species?.commonName || 'Plant'} has been removed from your garden.`,
        type: 'info',
        timestamp: new Date()
      });
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  // Force re-render every second to update timer
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const wateringSchedule = plant ? getWateringSchedule(plantId) : { daysUntil: 0, frequency: 7, isOverdue: true };

  const getDaysUntilWater = useCallback(() => {
    return wateringSchedule.daysUntil;
  }, [wateringSchedule.daysUntil]);

  // Derived State (Hoisted for handleWaterStart)
  const daysUntilWater = getDaysUntilWater();
  const needsWater = daysUntilWater === 0;
  const healthPercent = plant ? Math.round(plant.health * 100) : 0;

  // Glass panel styles based on theme
  const glassStyle = isDark
    ? 'backdrop-blur-xl bg-black/60 border border-white/10'
    : 'backdrop-blur-xl bg-white/70 border border-black/10';
  const textPrimary = isDark ? 'text-[#F5F3EE]' : 'text-[#050505]';
  const textSecondary = isDark ? 'text-[#F5F3EE]/70' : 'text-[#050505]/70';
  const textMuted = isDark ? 'text-[#F5F3EE]/50' : 'text-[#050505]/50';

  // Water particle physics simulation
  useEffect(() => {
    if (!isWatering) {
      setWaterParticles([]);
      setSplashParticles([]);
      return;
    }

    // Spawn new particles
    particleIntervalRef.current = setInterval(() => {
      const newParticles: WaterParticle[] = [];
      for (let i = 0; i < 3; i++) {
        newParticles.push({
          id: particleIdRef.current++,
          x: 50 + (Math.random() - 0.5) * 30,
          y: 0,
          vx: (Math.random() - 0.5) * 2,
          vy: 3 + Math.random() * 2,
          size: 2 + Math.random() * 3,
          opacity: 0.8 + Math.random() * 0.2,
          hasCollided: false,
        });
      }
      setWaterParticles(prev => [...prev.slice(-50), ...newParticles]);
    }, 50);

    return () => {
      if (particleIntervalRef.current) clearInterval(particleIntervalRef.current);
    };
  }, [isWatering]);

  // Update particle positions and handle collisions
  useEffect(() => {
    if (waterParticles.length === 0) return;

    const animationFrame = requestAnimationFrame(() => {
      setWaterParticles(prev => prev.map(p => {
        if (p.hasCollided) return p;

        const newY = p.y + p.vy;
        const newX = p.x + p.vx;

        // Soil collision at ~70% height
        if (newY > 65) {
          // Create splash particles
          const splashes: SplashParticle[] = [];
          for (let i = 0; i < 2; i++) {
            splashes.push({
              id: particleIdRef.current++,
              x: newX,
              y: newY,
              vx: (Math.random() - 0.5) * 3,
              vy: -Math.random() * 2,
              life: 1,
              color: 'rgba(135, 206, 235, 0.6)',
            });
          }
          setSplashParticles(prev => [...prev.slice(-20), ...splashes]);

          return { ...p, y: newY, x: newX, hasCollided: true };
        }

        return { ...p, y: newY, x: newX, vy: p.vy + 0.2 }; // Gravity
      }).filter(p => !p.hasCollided || Math.random() > 0.1)); // Fade out collided
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [waterParticles]);

  // Update splash particles
  useEffect(() => {
    if (splashParticles.length === 0) return;

    const animationFrame = requestAnimationFrame(() => {
      setSplashParticles(prev => prev.map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        life: p.life - 0.05,
      })).filter(p => p.life > 0));
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [splashParticles]);

  // Handle watering completion
  useEffect(() => {
    if (waterProgress >= 100 && isWatering) {
      // Clear interval
      if (waterIntervalRef.current) {
        clearInterval(waterIntervalRef.current);
        waterIntervalRef.current = null;
      }

      // Stop watering state
      setIsWatering(false);
      isWateringRef.current = false;
      setWaterProgress(0);

      // Execute Logic
      waterPlant(plantId);

      // Feedback
      triggerHaptic('success');
      playChime();

      // Visual Effects
      setShowBloomPulse(true);
      setShowGrowthEffect(true);
      setIsHiddenForGrowth(true);

      setTimeout(() => {
        setShowBloomPulse(false);
        setShowGrowthEffect(false);
        setIsHiddenForGrowth(false);
      }, 4500);
    }
  }, [waterProgress, isWatering, plantId, waterPlant, playChime, triggerHaptic]);

  const handleWaterStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Prevent double-firing on touch devices (which also fire mouse events)
    // We only prevent default if it's a touch event to stop the emulator mouse event
    if ('touches' in e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Check ref instead of state for immediate locking
    if (!plant || isWateringRef.current) return;

    const daysUntil = getDaysUntilWater();
    // Allow watering if it's very close (within 1 hour) or needs water
    // Logic: If the button is enabled, the user should be able to click it.
    // The strict check prevents execution if state update slightly lags or precision issues.
    if (daysUntil > 0.04 && !needsWater) return;

    // Trigger ripple effect
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setRipplePosition({
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    });
    setRippleActive(true);

    setIsWatering(true);
    isWateringRef.current = true;

    // Clear any existing interval just in case
    if (waterIntervalRef.current) clearInterval(waterIntervalRef.current);

    waterIntervalRef.current = setInterval(() => {
      setWaterProgress(prev => {
        if (prev >= 100) return 100;
        return prev + 2;
      });
    }, 30);
  }, [plant, plantId, getDaysUntilWater, needsWater]);

  const handleWaterEnd = useCallback(() => {
    if (waterProgress < 100) {
      setIsWatering(false);
      isWateringRef.current = false;
      setWaterProgress(0);
      setRippleActive(false);
      if (waterIntervalRef.current) {
        clearInterval(waterIntervalRef.current);
        waterIntervalRef.current = null;
      }
    }
  }, [waterProgress]);

  // Keydown handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (waterIntervalRef.current) clearInterval(waterIntervalRef.current);
      if (particleIntervalRef.current) clearInterval(particleIntervalRef.current);
    };
  }, []);

  if (!plant || !species) return null;



  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 pointer-events-none"
    >
      {/* Bloom pulse effect overlay */}
      <AnimatePresence>
        {showBloomPulse && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-50"
          >
            {/* Multiple expanding rings */}
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.5, opacity: 0.8 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{
                  duration: 1.5,
                  delay: i * 0.3,
                  ease: "easeOut"
                }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border-4 border-[#D4AF37]"
              />
            ))}

            {/* Central glow */}
            <motion.div
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: [0, 2, 2.5], opacity: [1, 0.8, 0] }}
              transition={{ duration: 2 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 rounded-full bg-[#D4AF37]/40 blur-3xl"
            />

            {/* Sparkle particles */}
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: '50vw',
                  y: '50vh',
                  scale: 0,
                  opacity: 1
                }}
                animate={{
                  x: `${50 + (Math.random() - 0.5) * 60}vw`,
                  y: `${50 + (Math.random() - 0.5) * 60}vh`,
                  scale: [0, 1, 0],
                  opacity: [1, 1, 0]
                }}
                transition={{
                  duration: 1.5 + Math.random(),
                  delay: Math.random() * 0.5
                }}
                className="absolute w-2 h-2 rounded-full bg-[#D4AF37]"
                style={{ boxShadow: '0 0 10px #D4AF37' }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Water particles with soil collision */}
      <AnimatePresence>
        {isWatering && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Falling water drops */}
            {waterParticles.map((particle) => (
              <div
                key={particle.id}
                className="absolute rounded-full bg-gradient-to-b from-[#4A9FD4] to-[#2A7FB4]"
                style={{
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                  width: `${particle.size}px`,
                  height: `${particle.size * 3}px`,
                  opacity: particle.opacity,
                  boxShadow: '0 0 6px rgba(74, 159, 212, 0.5)',
                }}
              />
            ))}

            {/* Splash particles on soil collision */}
            {splashParticles.map((splash) => (
              <motion.div
                key={splash.id}
                className="absolute w-1 h-1 rounded-full bg-[#4A9FD4]"
                style={{
                  left: `${splash.x}%`,
                  top: `${splash.y}%`,
                  boxShadow: '0 0 4px rgba(74, 159, 212, 0.8)',
                }}
              />
            ))}

            {/* Soil absorption effect */}
            <motion.div
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.02, 1]
              }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="absolute bottom-[30%] left-1/2 -translate-x-1/2 w-32 h-8 rounded-full bg-[#4A9FD4]/20 blur-xl"
            />
          </div>
        )}
      </AnimatePresence>

      {/* Navigation Buttons - Moved outside the card to screen edges */}
      <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-between px-4 md:px-8">
        {/* Previous Plant */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            const currentIndex = useGardenStore.getState().plants.findIndex(p => p.id === plantId);
            if (currentIndex > 0) {
              const prevPlant = useGardenStore.getState().plants[currentIndex - 1];
              useGardenStore.getState().selectPlant(prevPlant.id);
            }
          }}
          disabled={useGardenStore.getState().plants.findIndex(p => p.id === plantId) <= 0}
          className={`
            w-12 h-12 rounded-full flex items-center justify-center transition-all pointer-events-auto
            ${useGardenStore.getState().plants.findIndex(p => p.id === plantId) <= 0
              ? 'opacity-0 cursor-default'
              : 'bg-white/10 hover:bg-white/20 backdrop-blur-md cursor-pointer text-white border border-white/20'
            }
          `}
        >
          <ChevronLeft className="w-8 h-8" />
        </button>

        {/* Next Plant */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            const currentIndex = useGardenStore.getState().plants.findIndex(p => p.id === plantId);
            const plants = useGardenStore.getState().plants;
            if (currentIndex < plants.length - 1) {
              const nextPlant = plants[currentIndex + 1];
              useGardenStore.getState().selectPlant(nextPlant.id);
            }
          }}
          disabled={useGardenStore.getState().plants.findIndex(p => p.id === plantId) >= useGardenStore.getState().plants.length - 1}
          className={`
            w-12 h-12 rounded-full flex items-center justify-center transition-all pointer-events-auto
            ${useGardenStore.getState().plants.findIndex(p => p.id === plantId) >= useGardenStore.getState().plants.length - 1
              ? 'opacity-0 cursor-default'
              : 'bg-white/10 hover:bg-white/20 backdrop-blur-md cursor-pointer text-white border border-white/20'
            }
          `}
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      </div>

      {/* Glassmorphic HUD Panel */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{
          y: isHiddenForGrowth ? 200 : 0,
          opacity: isHiddenForGrowth ? 0 : 1
        }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="absolute bottom-0 left-0 right-0 p-4 md:p-6 pointer-events-auto"
      >
        <div ref={modalRef} className={`${glassStyle} rounded-3xl p-6 max-w-2xl mx-auto relative overflow-hidden shadow-2xl`}>
          {/* Animated glass shine effect */}
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 pointer-events-none"
          />

          {/* Growth effect overlay */}
          <AnimatePresence>
            {showGrowthEffect && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-gradient-to-t from-[#D4AF37]/30 to-transparent pointer-events-none rounded-3xl"
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.5, 0] }}
                    transition={{ duration: 1.5 }}
                    className="w-32 h-32 rounded-full bg-[#D4AF37]/40 blur-2xl"
                  />
                </div>
                <motion.div
                  initial={{ y: 0, opacity: 1 }}
                  animate={{ y: -50, opacity: 0 }}
                  transition={{ duration: 1.2 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 text-[#D4AF37]"
                >
                  <TrendingUp className="w-6 h-6" />
                  <span className="font-display text-2xl">+1 Growth</span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>



          {/* Close button */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
            {/* Menu Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`w-10 h-10 rounded-full ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/10 hover:bg-black/20'} flex items-center justify-center transition-colors cursor-pointer`}
              >
                <MoreVertical className={`w-5 h-5 ${textPrimary}`} />
              </button>

              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    className={`absolute right-0 top-12 w-48 rounded-xl shadow-xl overflow-hidden ${isDark ? 'bg-[#1A1A1A] border border-white/10' : 'bg-white border border-black/10'}`}
                  >
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setShowDeleteConfirm(true);
                      }}
                      className="w-full px-4 py-3 flex items-center gap-2 text-left text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="font-ui text-sm">Delete Plant</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={onClose}
              className={`w-10 h-10 rounded-full ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/10 hover:bg-black/20'} flex items-center justify-center transition-colors cursor-pointer`}
            >
              <X className={`w-5 h-5 ${textPrimary}`} />
            </button>
          </div>

          {/* Delete Confirmation Modal */}
          <AnimatePresence>
            {showDeleteConfirm && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowDeleteConfirm(false)}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />
                <motion.div
                  ref={deleteConfirmRef}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`relative w-full max-w-sm p-6 rounded-2xl shadow-2xl ${isDark ? 'bg-[#1A1A1A] border border-white/10' : 'bg-white border border-black/10'}`}
                >
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                      <h3 className={`font-display text-xl mb-2 ${textPrimary}`}>Delete Plant?</h3>
                      <p className={`font-ui text-sm ${textSecondary}`}>
                        Are you sure you want to remove this plant? This action cannot be undone and all growth progress will be lost.
                      </p>
                    </div>
                    <div className="flex gap-3 w-full mt-2">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className={`flex-1 py-2.5 rounded-xl font-ui text-sm font-medium transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-black/5 hover:bg-black/10 text-black'}`}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDelete}
                        className="flex-1 py-2.5 rounded-xl font-ui text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors shadow-lg shadow-red-500/20"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Plant info */}
          <div className="flex flex-col md:flex-row gap-6 relative z-10">
            {/* Left: Plant details */}
            <div className="flex-1">
              {/* Rarity badge */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`
                  px-3 py-1 rounded-full text-xs font-ui uppercase tracking-wider font-semibold
                  ${species.rarity === 'legendary' ? 'bg-gradient-to-r from-[#D4AF37]/30 to-[#F5D76E]/30 text-[#D4AF37] border border-[#D4AF37]/30' : ''}
                  ${species.rarity === 'ultra-rare' ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-purple-400 border border-purple-500/30' : ''}
                  ${species.rarity === 'rare' ? 'bg-gradient-to-r from-emerald-500/30 to-teal-500/30 text-emerald-400 border border-emerald-500/30' : ''}
                `}>
                  <Award className="w-3 h-3 inline mr-1" />
                  {species.rarity}
                </span>
                <span className="text-[#D4AF37] font-ui text-sm font-semibold">{species.value}</span>
              </div>

              {/* Species name */}
              <h2 className={`font-display text-3xl md:text-4xl ${textPrimary} mb-1 tracking-tight`}>
                {species.commonName}
              </h2>
              <p className={`${textMuted} font-ui text-sm italic mb-4`}>
                {species.name}
              </p>

              {/* Description */}
              <p className={`${textSecondary} font-ui text-sm leading-relaxed mb-6`}>
                {species.description}
              </p>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-4">
                {/* Growth Stage */}
                <div className={`${isDark ? 'bg-white/5' : 'bg-black/5'} rounded-xl p-3 text-center`}>
                  <div className={`flex items-center justify-center gap-1 ${textMuted} mb-1`}>
                    <Leaf className="w-4 h-4" />
                    <span className="text-xs font-ui">Stage</span>
                  </div>
                  <p className={`font-display text-2xl ${textPrimary}`}>
                    {Math.floor(plant.growthStage)}<span className={`text-sm ${textMuted}`}>/30</span>
                  </p>
                  {/* Show animation indicator */}
                  {plant.growthStage !== plant.targetGrowthStage && (
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="text-xs text-[#D4AF37] mt-1"
                    >
                      {plant.growthStage < plant.targetGrowthStage ? '↑' : '↓'}
                    </motion.div>
                  )}
                </div>

                {/* Health */}
                <div className={`${isDark ? 'bg-white/5' : 'bg-black/5'} rounded-xl p-3 text-center`}>
                  <div className={`flex items-center justify-center gap-1 ${textMuted} mb-1`}>
                    <Heart className="w-4 h-4" />
                    <span className="text-xs font-ui">Health</span>
                  </div>
                  <p className={`font-display text-2xl ${healthPercent > 70 ? 'text-emerald-400' :
                    healthPercent > 40 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                    {healthPercent}%
                  </p>
                  {/* Show recovery indicator */}
                  {plant.wasNeglected && plant.growthAnimationSpeed === 2 && (
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                      className="text-xs text-emerald-400 mt-1"
                    >
                      Recovering 2x
                    </motion.div>
                  )}
                </div>

                {/* Water timer */}
                <div className={`${isDark ? 'bg-white/5' : 'bg-black/5'} rounded-xl p-3 text-center`}>
                  <div className={`flex items-center justify-center gap-1 ${textMuted} mb-1`}>
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-ui">Water</span>
                  </div>
                  <p className={`font-display text-2xl ${needsWater ? 'text-[#4A9FD4]' : textPrimary
                    }`}>
                    {needsWater
                      ? 'Now!'
                      : daysUntilWater < 1 / 24 // Less than an hour
                        ? `${Math.ceil(daysUntilWater * 24 * 60)}m`
                        : daysUntilWater < 1 // Less than a day
                          ? `${Math.ceil(daysUntilWater * 24)}h`
                          : `${Math.ceil(daysUntilWater)}d`
                    }
                  </p>
                  {/* Show watering frequency */}
                  <p className={`text-xs ${textMuted} mt-1`}>
                    Every {wateringSchedule.frequency < 1
                      ? `${Math.round(wateringSchedule.frequency * 24 * 60)}m`
                      : `${wateringSchedule.frequency}d`}
                  </p>
                </div>
              </div>

              {/* Neglect warning */}
              {plant.wasNeglected && healthPercent < 50 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-4 p-3 rounded-xl ${isDark ? 'bg-red-500/10 border border-red-500/30' : 'bg-red-500/20 border border-red-500/40'}`}
                >
                  <p className="text-red-400 font-ui text-sm text-center">
                    ⚠️ Plant is severely stressed! Water immediately to prevent further decline.
                  </p>
                </motion.div>
              )}
            </div>

            {/* Right: Water button with liquid shader effect */}
            <div className="flex flex-col items-center justify-center">
              <motion.button
                onMouseDown={handleWaterStart}
                onMouseUp={handleWaterEnd}
                onMouseLeave={handleWaterEnd}
                onTouchStart={handleWaterStart}
                onTouchEnd={handleWaterEnd}
                disabled={!needsWater}
                className={`
                  relative group
                  ${!needsWater ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {/* Outer glow */}
                <motion.div
                  animate={needsWater ? {
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3]
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`
                    absolute inset-0 rounded-full blur-2xl transition-all duration-300
                    ${isWatering
                      ? 'bg-[#4A9FD4] opacity-80 scale-150'
                      : needsWater
                        ? 'bg-[#4A9FD4] opacity-40'
                        : 'bg-gray-500 opacity-20'
                    }
                  `}
                />

                {/* Liquid surface container */}
                <div className={`
                  relative w-24 h-24 rounded-full overflow-hidden
                  shadow-2xl transition-all duration-200
                  ${needsWater
                    ? 'shadow-[#4A9FD4]/40'
                    : 'shadow-gray-500/20'
                  }
                  ${isWatering ? 'scale-95' : needsWater ? 'hover:scale-105' : ''}
                `}>
                  {/* Base gradient */}
                  <div className={`
                    absolute inset-0
                    ${needsWater
                      ? 'bg-gradient-to-br from-[#4A9FD4] via-[#3A8FC4] to-[#2A7FB4]'
                      : 'bg-gradient-to-br from-gray-500 to-gray-600'
                    }
                  `} />

                  {/* Liquid surface shader simulation */}
                  {needsWater && (
                    <>
                      {/* Wave animation layer 1 */}
                      <motion.div
                        animate={{
                          y: isWatering ? [0, -5, 0] : [0, -2, 0],
                          rotate: [0, 5, 0, -5, 0]
                        }}
                        transition={{
                          duration: isWatering ? 0.3 : 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="absolute inset-0 bg-gradient-to-t from-[#2A7FB4]/60 via-transparent to-[#6AC0E8]/30"
                      />

                      {/* Wave animation layer 2 */}
                      <motion.div
                        animate={{
                          y: isWatering ? [0, 3, 0] : [0, 1, 0],
                          x: [0, 2, 0, -2, 0]
                        }}
                        transition={{
                          duration: isWatering ? 0.4 : 2.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 0.2
                        }}
                        className="absolute inset-0 bg-gradient-to-br from-transparent via-white/20 to-transparent"
                      />

                      {/* Ripple effect on touch */}
                      <AnimatePresence>
                        {rippleActive && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0.8 }}
                            animate={{ scale: 4, opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8 }}
                            className="absolute w-8 h-8 rounded-full border-2 border-white/50"
                            style={{
                              left: `${ripplePosition.x}%`,
                              top: `${ripplePosition.y}%`,
                              transform: 'translate(-50%, -50%)'
                            }}
                          />
                        )}
                      </AnimatePresence>

                      {/* Surface highlight */}
                      <div className="absolute top-2 left-4 w-8 h-3 bg-white/30 rounded-full blur-sm" />
                    </>
                  )}

                  {/* Icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Droplets className={`w-10 h-10 ${needsWater ? 'text-white' : 'text-gray-400'} drop-shadow-lg`} />
                  </div>
                </div>

                {/* Progress ring */}
                {needsWater && (
                  <svg className="absolute inset-0 w-24 h-24 -rotate-90 pointer-events-none">
                    <circle
                      cx="48"
                      cy="48"
                      r="44"
                      fill="none"
                      stroke="#D4AF37"
                      strokeWidth="4"
                      strokeDasharray={276}
                      strokeDashoffset={276 - (276 * waterProgress) / 100}
                      className="transition-all duration-75"
                      style={{ filter: 'drop-shadow(0 0 6px rgba(212, 175, 55, 0.8))' }}
                    />
                  </svg>
                )}
              </motion.button>

              <p className={`mt-4 ${textMuted} font-ui text-sm text-center`}>
                {needsWater ? (
                  <span className="flex items-center gap-1">
                    <motion.span
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      Hold to water
                    </motion.span>
                  </span>
                ) : 'Well hydrated'}
              </p>

              {/* Water progress indicator */}
              {isWatering && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-[#4A9FD4] font-ui text-xs"
                >
                  {waterProgress}% hydrated
                </motion.p>
              )}
            </div>
          </div>

          {/* Growth progress bar */}
          <div className={`mt-6 pt-4 border-t ${isDark ? 'border-white/10' : 'border-black/10'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`${textMuted} font-ui text-xs`}>Growth Progress</span>
              <span className="text-[#D4AF37] font-ui text-xs font-semibold">
                {Math.round((plant.growthStage / 30) * 100)}% to maturity
              </span>
            </div>
            <div className={`h-2 ${isDark ? 'bg-white/10' : 'bg-black/10'} rounded-full overflow-hidden`}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(plant.growthStage / 30) * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-[#004030] via-[#D4AF37] to-[#F5D76E] rounded-full relative"
              >
                {/* Shimmer effect */}
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                />
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
