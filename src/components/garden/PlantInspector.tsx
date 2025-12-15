import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Droplets, Leaf, Calendar, TrendingUp, Sparkles, Heart, Clock, Award } from 'lucide-react';
import { useGardenStore, PLANT_SPECIES } from '@/store/gardenStore';

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

export function PlantInspector({ plantId, onClose }: PlantInspectorProps) {
  const [isWatering, setIsWatering] = useState(false);
  const [waterProgress, setWaterProgress] = useState(0);
  const [showGrowthEffect, setShowGrowthEffect] = useState(false);
  const [showBloomPulse, setShowBloomPulse] = useState(false);
  const [rippleActive, setRippleActive] = useState(false);
  const [ripplePosition, setRipplePosition] = useState({ x: 50, y: 50 });
  const [waterParticles, setWaterParticles] = useState<WaterParticle[]>([]);
  const [splashParticles, setSplashParticles] = useState<{ id: number; x: number; y: number; vx: number; vy: number }[]>([]);
  const particleIdRef = useRef(0);
  const waterIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const particleIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const plant = useGardenStore(state => state.plants.find(p => p.id === plantId));
  const waterPlant = useGardenStore(state => state.waterPlant);
  const themeMode = useGardenStore(state => state.themeMode);
  const getWateringSchedule = useGardenStore(state => state.getWateringSchedule);
  
  const species = plant ? PLANT_SPECIES.find(s => s.id === plant.speciesId) : null;
  
  const isDark = themeMode === 'dark';
  
  // Get species-specific watering schedule
  const wateringSchedule = plant ? getWateringSchedule(plantId) : { daysUntil: 0, frequency: 7, isOverdue: true };
  
  const getDaysUntilWater = useCallback(() => {
    return wateringSchedule.daysUntil;
  }, [wateringSchedule.daysUntil]);

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
          setSplashParticles(sp => [
            ...sp.slice(-20),
            { id: p.id, x: newX, y: 65, vx: (Math.random() - 0.5) * 4, vy: -2 - Math.random() * 2 },
            { id: p.id + 0.1, x: newX, y: 65, vx: (Math.random() - 0.5) * 4, vy: -1 - Math.random() * 2 },
          ]);
          return { ...p, hasCollided: true, opacity: 0 };
        }
        
        return {
          ...p,
          x: newX,
          y: newY,
          vy: p.vy + 0.15, // Gravity
        };
      }).filter(p => p.opacity > 0));
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [waterParticles]);

  // Animate splash particles
  useEffect(() => {
    if (splashParticles.length === 0) return;

    const timeout = setTimeout(() => {
      setSplashParticles(prev => prev.map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        vy: p.vy + 0.3,
      })).filter(p => p.y < 80));
    }, 16);

    return () => clearTimeout(timeout);
  }, [splashParticles]);
  
  const handleWaterStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!plant) return;
    
    const daysUntil = getDaysUntilWater();
    if (daysUntil > 0) return;
    
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
    waterIntervalRef.current = setInterval(() => {
      setWaterProgress(prev => {
        if (prev >= 100) {
          if (waterIntervalRef.current) clearInterval(waterIntervalRef.current);
          setIsWatering(false);
          waterPlant(plantId);
          
          // Trigger bloom pulse effect
          setShowBloomPulse(true);
          setShowGrowthEffect(true);
          setTimeout(() => {
            setShowBloomPulse(false);
            setShowGrowthEffect(false);
          }, 2500);
          
          return 0;
        }
        return prev + 2;
      });
    }, 30);
  }, [plant, plantId, waterPlant, getDaysUntilWater]);
  
  const handleWaterEnd = useCallback(() => {
    if (waterProgress < 100) {
      setIsWatering(false);
      setWaterProgress(0);
      setRippleActive(false);
      if (waterIntervalRef.current) clearInterval(waterIntervalRef.current);
    }
  }, [waterProgress]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (waterIntervalRef.current) clearInterval(waterIntervalRef.current);
      if (particleIntervalRef.current) clearInterval(particleIntervalRef.current);
    };
  }, [onClose]);
  
  if (!plant || !species) return null;
  
  const daysUntilWater = getDaysUntilWater();
  const needsWater = daysUntilWater === 0;
  const healthPercent = Math.round(plant.health * 100);
  
  // Glass panel styles based on theme
  const glassStyle = isDark 
    ? 'backdrop-blur-xl bg-black/60 border border-white/10' 
    : 'backdrop-blur-xl bg-white/70 border border-black/10';
  const textPrimary = isDark ? 'text-[#F5F3EE]' : 'text-[#050505]';
  const textSecondary = isDark ? 'text-[#F5F3EE]/70' : 'text-[#050505]/70';
  const textMuted = isDark ? 'text-[#F5F3EE]/50' : 'text-[#050505]/50';
  
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

      {/* Glassmorphic HUD Panel */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="absolute bottom-0 left-0 right-0 p-4 md:p-6 pointer-events-auto"
      >
        <div className={`${glassStyle} rounded-3xl p-6 max-w-2xl mx-auto relative overflow-hidden shadow-2xl`}>
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
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 w-10 h-10 rounded-full ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/10 hover:bg-black/20'} flex items-center justify-center transition-colors z-10`}
          >
            <X className={`w-5 h-5 ${textPrimary}`} />
          </button>
          
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
                  <p className={`font-display text-2xl ${
                    healthPercent > 70 ? 'text-emerald-400' :
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
                  <p className={`font-display text-2xl ${
                    needsWater ? 'text-[#4A9FD4]' : textPrimary
                  }`}>
                    {needsWater ? 'Now!' : `${daysUntilWater}d`}
                  </p>
                  {/* Show watering frequency */}
                  <p className={`text-xs ${textMuted} mt-1`}>
                    Every {wateringSchedule.frequency}d
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
