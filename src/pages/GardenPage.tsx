import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { LogOut, Sun, Moon } from 'lucide-react';
import { GardenScene } from '@/components/garden/GardenScene';
import { GardenHUD } from '@/components/garden/GardenHUD';
import { PlantInspector } from '@/components/garden/PlantInspector';
import { AddPlantModal } from '@/components/garden/AddPlantModal';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { GlassButton } from '@/components/ui/glass-button';
import { useGardenStore } from '@/store/gardenStore';

export function GardenPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const isAuthenticated = useGardenStore(state => state.isAuthenticated);
  const userEmail = useGardenStore(state => state.userEmail);
  const hasCompletedOnboarding = useGardenStore(state => state.hasCompletedOnboarding);
  const selectedPlantId = useGardenStore(state => state.selectedPlantId);
  const isInspecting = useGardenStore(state => state.isInspecting);
  const selectPlant = useGardenStore(state => state.selectPlant);
  const setInspecting = useGardenStore(state => state.setInspecting);
  const updatePlantHealth = useGardenStore(state => state.updatePlantHealth);
  const checkStreak = useGardenStore(state => state.checkStreak);
  const signIn = useGardenStore(state => state.signIn);
  const signOut = useGardenStore(state => state.signOut);
  const resetGarden = useGardenStore(state => state.resetGarden);
  const themeMode = useGardenStore(state => state.themeMode);
  const toggleTheme = useGardenStore(state => state.toggleTheme);
  const updateGrowthAnimation = useGardenStore(state => state.updateGrowthAnimation);
  const updateGamificationMetrics = useGardenStore(state => state.updateGamificationMetrics);

  // Check if we need to show onboarding
  useEffect(() => {
    if (isAuthenticated && !hasCompletedOnboarding) {
      setShowOnboarding(true);
    }
  }, [isAuthenticated, hasCompletedOnboarding]);

  // Update plant health periodically
  useEffect(() => {
    if (!isAuthenticated) return;

    updatePlantHealth();
    checkStreak();
    updateGamificationMetrics();

    const interval = setInterval(() => {
      updatePlantHealth();
      checkStreak();
      updateGamificationMetrics();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [isAuthenticated, updatePlantHealth, checkStreak, updateGamificationMetrics]);

  // Smooth growth animation loop (morph target interpolation)
  useEffect(() => {
    if (!isAuthenticated) return;

    const animationInterval = setInterval(() => {
      updateGrowthAnimation();
    }, 100); // Update 10 times per second for smooth animation

    return () => clearInterval(animationInterval);
  }, [isAuthenticated, updateGrowthAnimation]);

  const handlePlantSelect = useCallback((plantId: string) => {
    selectPlant(plantId);
    setInspecting(true);
  }, [selectPlant, setInspecting]);

  const handleCloseInspector = useCallback(() => {
    setInspecting(false);
    setTimeout(() => selectPlant(null), 300);
  }, [selectPlant, setInspecting]);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  const handleSignIn = useCallback((email: string) => {
    signIn(email);
  }, [signIn]);

  const handleSignOut = useCallback(() => {
    if (confirm('Sign out? Your garden will be saved.')) {
      signOut();
    }
  }, [signOut]);

  const handleResetGarden = useCallback(() => {
    if (confirm('Reset your entire garden? This cannot be undone.')) {
      resetGarden();
      setShowOnboarding(true);
    }
  }, [resetGarden]);

  // Show auth screen if not authenticated
  if (!isAuthenticated) {
    return <AuthScreen onSignIn={handleSignIn} />;
  }

  return (
    <div className={`w-full h-full overflow-hidden transition-colors duration-500 ${themeMode === 'dark' ? 'bg-[#050505]' : 'bg-[#F5F3EE]'
      }`}>
      {/* 3D Garden Scene */}
      <GardenScene onPlantSelect={handlePlantSelect} themeMode={themeMode} />

      {/* HUD Overlay */}
      {!showOnboarding && (
        <>
          <GardenHUD
            onAddPlant={() => setShowAddModal(true)}
            onOpenMarketplace={() => { }} // Not implemented in this version?
          />

          {/* User menu */}
          <div className="fixed top-4 right-4 z-40 flex items-center gap-3">
            {/* Theme toggle */}
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className={`flex items-center gap-2 ${themeMode === 'light' ? 'bg-black/10 text-[#050505]' : ''
                }`}
            >
              {themeMode === 'dark' ? (
                <Sun className="w-4 h-4 text-[#D4AF37]" />
              ) : (
                <Moon className="w-4 h-4 text-[#1A2B3C]" />
              )}
            </GlassButton>

            <div className="text-right">
              <p className={`font-ui text-xs ${themeMode === 'dark' ? 'text-marble/60' : 'text-[#050505]/60'
                }`}>{userEmail}</p>
            </div>
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className={`flex items-center gap-2 ${themeMode === 'light' ? 'bg-black/10 text-[#050505]' : ''
                }`}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </GlassButton>
          </div>

          {/* Reset button (dev mode) */}
          <div className="fixed bottom-4 right-4 z-40">
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={handleResetGarden}
              className={`text-xs opacity-30 hover:opacity-100 ${themeMode === 'light' ? 'text-[#050505]' : ''
                }`}
            >
              Reset Garden
            </GlassButton>
          </div>
        </>
      )}

      {/* Plant Inspector */}
      <AnimatePresence>
        {isInspecting && selectedPlantId && (
          <PlantInspector
            plantId={selectedPlantId}
            onClose={handleCloseInspector}
          />
        )}
      </AnimatePresence>

      {/* Add Plant Modal */}
      <AddPlantModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      {/* Onboarding Flow */}
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingFlow onComplete={handleOnboardingComplete} />
        )}
      </AnimatePresence>
    </div>
  );
}
