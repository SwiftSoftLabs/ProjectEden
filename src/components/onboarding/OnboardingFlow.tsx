import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Droplets, Sparkles } from 'lucide-react';
import { useGardenStore, PLANT_SPECIES } from '@/store/gardenStore';

type OnboardingStep = 'void' | 'acquisition' | 'selection' | 'watering' | 'complete';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<OnboardingStep>('void');
  const [isButtonPressed, setIsButtonPressed] = useState(false);
  const [isWatering, setIsWatering] = useState(false);
  const [waterProgress, setWaterProgress] = useState(0);
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);
  const [showParticles, setShowParticles] = useState(false);
  const [plantGrowth, setPlantGrowth] = useState(0);

  const addPlant = useGardenStore(state => state.addPlant);
  const completeOnboarding = useGardenStore(state => state.completeOnboarding);

  // Void stage spotlight animation
  useEffect(() => {
    if (step === 'void') {
      setTimeout(() => setStep('acquisition'), 3000);
    }
  }, [step]);

  const handleAddButtonClick = useCallback(() => {
    setIsButtonPressed(true);
    setTimeout(() => {
      setStep('selection');
      setIsButtonPressed(false);
    }, 600);
  }, []);

  const handleSpeciesSelect = useCallback((speciesId: string) => {
    setSelectedSpecies(speciesId);
    setShowParticles(true);

    // Particle dissolve animation
    setTimeout(() => {
      addPlant(speciesId);
      setShowParticles(false);
      setTimeout(() => {
        setStep('watering');
      }, 1000);
    }, 2000);
  }, [addPlant]);

  const handleWaterStart = useCallback(() => {
    setIsWatering(true);
    const interval = setInterval(() => {
      setWaterProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsWatering(false);

          // Instant visible growth animation
          const growthInterval = setInterval(() => {
            setPlantGrowth(g => {
              if (g >= 100) {
                clearInterval(growthInterval);
                setTimeout(() => {
                  setStep('complete');
                  setTimeout(() => {
                    completeOnboarding();
                    onComplete();
                  }, 2000);
                }, 500);
                return 100;
              }
              return g + 5;
            });
          }, 50);

          return 100;
        }
        return prev + 2;
      });
    }, 50);
  }, [completeOnboarding, onComplete]);

  const handleWaterEnd = useCallback(() => {
    if (waterProgress < 100) {
      setIsWatering(false);
    }
  }, [waterProgress]);

  return (
    <div className="fixed inset-0 bg-[#050505] z-50 overflow-hidden">
      <AnimatePresence mode="wait">
        {/* Void Stage - Total darkness with spotlight */}
        {step === 'void' && (
          <motion.div
            key="void"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
            className="absolute inset-0 flex flex-col items-center justify-center"
          >
            {/* Dramatic spotlight effect */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 2 }}
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(circle at 50% 60%, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 30%, transparent 60%)'
              }}
            />

            {/* Marble pedestal with enhanced lighting */}
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1, duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              {/* Pedestal glow */}
              <div className="absolute inset-0 blur-2xl bg-[#D4AF37]/10 scale-150" />

              {/* Pedestal structure */}
              <div className="relative">
                <div className="w-32 h-4 bg-gradient-to-b from-[#F5F3EE] to-[#D4D0C8] rounded-t-sm shadow-2xl" />
                <div className="w-28 h-20 mx-auto bg-gradient-to-b from-[#E8E4DC] to-[#C8C4BC] shadow-xl" />
                <div className="w-36 h-3 mx-auto bg-gradient-to-b from-[#D4D0C8] to-[#B8B4AC] -mt-px shadow-2xl" />
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Acquisition Moment - Glowing + button */}
        {step === 'acquisition' && (
          <motion.div
            key="acquisition"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center"
          >
            {/* Spotlight continues */}
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(circle at 50% 60%, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 30%, transparent 60%)'
              }}
            />

            {/* Pedestal */}
            <div className="relative mb-16">
              <div className="absolute inset-0 blur-2xl bg-[#D4AF37]/10 scale-150" />
              <div className="relative">
                <div className="w-32 h-4 bg-gradient-to-b from-[#F5F3EE] to-[#D4D0C8] rounded-t-sm shadow-2xl" />
                <div className="w-28 h-20 mx-auto bg-gradient-to-b from-[#E8E4DC] to-[#C8C4BC] shadow-xl" />
                <div className="w-36 h-3 mx-auto bg-gradient-to-b from-[#D4D0C8] to-[#B8B4AC] -mt-px shadow-2xl" />
              </div>
            </div>

            {/* Text prompt */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="font-display text-4xl md:text-6xl text-[#F5F3EE] mb-16 text-center tracking-wide"
            >
              Begin your collection
            </motion.h1>

            {/* Glowing + button with physical compression */}
            <motion.button
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: 1,
                scale: isButtonPressed ? 0.85 : 1,
              }}
              transition={{
                delay: 1,
                duration: 0.5,
                scale: { type: 'spring', stiffness: 500, damping: 30 }
              }}
              onClick={handleAddButtonClick}
              className="relative group"
            >
              {/* Outer glow - pulsing */}
              <motion.div
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                  scale: [1, 1.2, 1]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 bg-[#D4AF37] rounded-full blur-2xl"
              />

              {/* Middle glow */}
              <div className="absolute inset-0 bg-[#D4AF37] rounded-full blur-xl opacity-60 group-hover:opacity-90 transition-opacity" />

              {/* Button with compression effect */}
              <motion.div
                animate={{
                  boxShadow: isButtonPressed
                    ? '0 4px 20px rgba(212, 175, 55, 0.4)'
                    : '0 10px 40px rgba(212, 175, 55, 0.5)'
                }}
                className={`
                  relative w-24 h-24 rounded-full 
                  bg-gradient-to-br from-[#D4AF37] via-[#C9A532] to-[#B8962E]
                  flex items-center justify-center
                  transition-all duration-200
                  ${isButtonPressed ? 'shadow-inner' : 'hover:scale-105'}
                `}
              >
                <Plus
                  className="w-12 h-12 text-[#050505]"
                  strokeWidth={3}
                />
              </motion.div>
            </motion.button>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="mt-8 text-[#F5F3EE]/50 font-ui text-sm"
            >
              Press to acquire
            </motion.p>
          </motion.div>
        )}

        {/* Selection Stage with Particle Dissolve */}
        {step === 'selection' && (
          <motion.div
            key="selection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-6"
          >
            <motion.h2
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-3xl md:text-5xl text-[#F5F3EE] mb-8 text-center"
            >
              Select your first specimen
            </motion.h2>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-6xl max-h-[60vh] overflow-y-auto p-4"
            >
              {PLANT_SPECIES.map((species, index) => (
                <motion.button
                  key={species.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  onClick={() => handleSpeciesSelect(species.id)}
                  disabled={selectedSpecies !== null}
                  className={`
                    relative backdrop-blur-lg bg-black/40 border border-white/10 rounded-2xl
                    p-4 text-left transition-all duration-300
                    ${selectedSpecies === species.id
                      ? 'ring-2 ring-[#D4AF37] shadow-lg shadow-[#D4AF37]/30'
                      : 'hover:ring-1 hover:ring-[#D4AF37]/50'}
                    ${selectedSpecies && selectedSpecies !== species.id ? 'opacity-30' : ''}
                  `}
                >
                  <div
                    className="w-full aspect-square rounded-lg mb-3 flex items-center justify-center relative overflow-hidden"
                    style={{ backgroundColor: species.color + '40' }}
                  >
                    <Sparkles className="w-12 h-12" style={{ color: species.color }} />

                    {/* Particle dissolve effect */}
                    {selectedSpecies === species.id && showParticles && (
                      <div className="absolute inset-0">
                        {Array.from({ length: 30 }).map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{
                              x: '50%',
                              y: '50%',
                              scale: 1,
                              opacity: 1
                            }}
                            animate={{
                              x: `${50 + (Math.random() - 0.5) * 200}%`,
                              y: `${50 + (Math.random() - 0.5) * 200}%`,
                              scale: 0,
                              opacity: 0
                            }}
                            transition={{
                              duration: 1.5,
                              delay: i * 0.02,
                              ease: "easeOut"
                            }}
                            className="absolute w-1 h-1 rounded-full"
                            style={{ backgroundColor: species.color }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <h3 className="font-display text-lg text-[#F5F3EE] leading-tight">
                    {species.commonName}
                  </h3>
                  <p className="text-xs text-[#F5F3EE]/60 mt-1 font-ui">
                    {species.rarity.toUpperCase()}
                  </p>
                  <p className="text-sm text-[#D4AF37] mt-2 font-ui">
                    {species.value}
                  </p>
                </motion.button>
              ))}
            </motion.div>

            {selectedSpecies && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-8 text-center"
              >
                <div className="flex items-center justify-center gap-2 text-[#D4AF37]">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                  <span className="font-display text-xl">Materializing...</span>
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Watering Stage - Hold-to-water with particle stream */}
        {step === 'watering' && (
          <motion.div
            key="watering"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center"
          >
            <motion.h2
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-3xl md:text-5xl text-[#F5F3EE] mb-4 text-center"
            >
              Sustain life
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-[#F5F3EE]/60 font-ui mb-12"
            >
              Hold to water your plant
            </motion.p>

            {/* Enhanced water particle stream */}
            {isWatering && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-full pointer-events-none overflow-hidden">
                {Array.from({ length: 40 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{
                      y: -20,
                      x: (Math.random() - 0.5) * 60,
                      opacity: 0,
                      scale: Math.random() * 0.5 + 0.5
                    }}
                    animate={{
                      y: '100vh',
                      opacity: [0, 1, 1, 0.5, 0],
                      rotate: Math.random() * 360
                    }}
                    transition={{
                      duration: 1.2 + Math.random() * 0.5,
                      delay: i * 0.05,
                      repeat: Infinity,
                      ease: [0.4, 0, 0.6, 1],
                    }}
                    className="absolute rounded-full"
                    style={{
                      width: `${2 + Math.random() * 3}px`,
                      height: `${8 + Math.random() * 8}px`,
                      background: 'linear-gradient(to bottom, rgba(74, 159, 212, 0.9), rgba(42, 127, 180, 0.7))',
                      boxShadow: '0 0 4px rgba(74, 159, 212, 0.5)'
                    }}
                  />
                ))}
              </div>
            )}

            {/* Plant visualization with instant growth */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: 1 + (waterProgress * 0.003) + (plantGrowth * 0.005),
                opacity: 1,
                y: plantGrowth > 0 ? -plantGrowth * 0.2 : 0
              }}
              className="relative mb-12"
            >
              {/* Plant container */}
              <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-[#4A7C59] to-[#2D5A3D] flex items-center justify-center">
                <Sparkles className="w-16 h-16 text-[#F5F3EE]" />

                {/* Growth leaves animation */}
                {plantGrowth > 0 && (
                  <>
                    {Array.from({ length: Math.floor(plantGrowth / 20) }).map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0, rotate: 0 }}
                        animate={{
                          scale: 1,
                          rotate: (i * 72) + (plantGrowth * 2)
                        }}
                        transition={{
                          duration: 0.5,
                          delay: i * 0.1
                        }}
                        className="absolute w-8 h-12 bg-gradient-to-t from-[#4A7C59] to-[#6B9A7A] rounded-full"
                        style={{
                          top: '20%',
                          left: '50%',
                          transformOrigin: 'bottom center',
                        }}
                      />
                    ))}
                  </>
                )}
              </div>

              {/* Bloom pulse effect */}
              {waterProgress > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{
                    scale: 1 + waterProgress * 0.015,
                    opacity: [0.3, 0.6, 0.3]
                  }}
                  transition={{
                    scale: { duration: 0.3 },
                    opacity: { duration: 1.5, repeat: Infinity }
                  }}
                  className="absolute inset-0 rounded-full bg-[#D4AF37]/30 blur-2xl"
                />
              )}

              {/* Intense growth glow */}
              {plantGrowth > 50 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 0.8, 0.5]
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity
                  }}
                  className="absolute inset-0 rounded-full bg-[#4A7C59]/40 blur-3xl"
                />
              )}
            </motion.div>

            {/* Water button with liquid surface shader effect */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              onMouseDown={handleWaterStart}
              onMouseUp={handleWaterEnd}
              onMouseLeave={handleWaterEnd}
              onTouchStart={handleWaterStart}
              onTouchEnd={handleWaterEnd}
              className="relative group"
            >
              {/* Outer glow */}
              <div className={`
                absolute inset-0 rounded-full blur-2xl transition-all duration-300
                ${isWatering ? 'bg-[#4A9FD4] opacity-90 scale-110' : 'bg-[#4A9FD4] opacity-40'}
              `} />

              {/* Ripple effect on press */}
              {isWatering && (
                <motion.div
                  initial={{ scale: 1, opacity: 0.8 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="absolute inset-0 rounded-full border-2 border-[#4A9FD4]"
                />
              )}

              {/* Button with liquid shader simulation */}
              <motion.div
                animate={{
                  boxShadow: isWatering
                    ? '0 4px 30px rgba(74, 159, 212, 0.6), inset 0 2px 10px rgba(0,0,0,0.3)'
                    : '0 10px 40px rgba(74, 159, 212, 0.4)',
                }}
                className={`
                  relative w-28 h-28 rounded-full overflow-hidden
                  bg-gradient-to-br from-[#4A9FD4] via-[#3A8FC4] to-[#2A7FB4]
                  flex items-center justify-center
                  transition-all duration-200
                  ${isWatering ? 'scale-95' : 'hover:scale-105'}
                `}
              >
                {/* Liquid surface animation */}
                <motion.div
                  animate={{
                    y: isWatering ? [0, -5, 0] : 0,
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: isWatering ? Infinity : 0
                  }}
                  className="absolute inset-0 bg-gradient-to-t from-[#2A7FB4]/50 to-transparent"
                />

                <Droplets className="relative w-12 h-12 text-white z-10" />
              </motion.div>

              {/* Progress ring */}
              <svg className="absolute inset-0 w-28 h-28 -rotate-90 pointer-events-none">
                <circle
                  cx="56"
                  cy="56"
                  r="52"
                  fill="none"
                  stroke="#D4AF37"
                  strokeWidth="3"
                  strokeDasharray={327}
                  strokeDashoffset={327 - (327 * waterProgress) / 100}
                  className="transition-all duration-100"
                  style={{
                    filter: 'drop-shadow(0 0 4px rgba(212, 175, 55, 0.6))'
                  }}
                />
              </svg>
            </motion.button>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-6 text-[#F5F3EE]/40 font-ui text-sm"
            >
              {waterProgress}% hydrated
            </motion.p>

            {/* Growth indicator */}
            {plantGrowth > 0 && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-[#4A7C59] font-ui text-sm font-semibold"
              >
                Growing... {plantGrowth}%
              </motion.p>
            )}
          </motion.div>
        )}

        {/* Complete Stage */}
        {step === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-[#D4AF37] rounded-full blur-3xl opacity-30 animate-pulse" />
              <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8962E] flex items-center justify-center">
                <Sparkles className="w-16 h-16 text-[#050505]" />
              </div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="font-display text-4xl md:text-6xl text-[#F5F3EE] mt-8 text-center"
            >
              Welcome to Eden
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-[#F5F3EE]/60 font-ui mt-4"
            >
              Your botanical sanctuary awaits
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
