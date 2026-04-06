import { motion } from 'framer-motion';
import { Plus, Flame, Leaf, Sun, Moon, ChevronLeft, ChevronRight, User, Globe } from 'lucide-react';
import { useGardenStore } from '@/store/gardenStore';
import { useAuth } from '@/providers/AuthProvider';
import { UserProfileModal } from '../auth/UserProfileModal';
import { useState } from 'react';

import { SubscriptionModal } from './SubscriptionModal';

interface GardenHUDProps {
  onAddPlant: () => void;
  onOpenMarketplace: () => void;
}


export function GardenHUD({ onAddPlant, onOpenMarketplace }: GardenHUDProps) {
  const { user } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const plants = useGardenStore(state => state.plants);
  const streak = useGardenStore(state => state.streak);
  const lightingMode = useGardenStore(state => state.lightingMode);
  const themeMode = useGardenStore(state => state.themeMode);
  const subscriptionTier = useGardenStore(state => state.subscriptionTier);
  const rootNetworkExpansion = useGardenStore(state => state.rootNetworkExpansion);
  const careConsistency = useGardenStore(state => state.careConsistency);

  const totalGrowth = plants.reduce((sum, p) => sum + p.growthStage, 0);
  const maxGrowth = plants.length * 30;
  const gardenProgress = maxGrowth > 0 ? Math.round((totalGrowth / maxGrowth) * 100) : 0;

  const isDark = themeMode === 'dark';
  const textColor = isDark ? 'text-[#F5F3EE]' : 'text-[#050505]';
  const textMuted = isDark ? 'text-[#F5F3EE]/70' : 'text-[#050505]/70';
  const glassStyle = isDark ? 'glass-panel' : 'bg-white/80 backdrop-blur-lg border border-black/10 rounded-2xl';

  // Determine streak risk level
  const streakAtRisk = careConsistency < 0.5;
  const streakColor = streakAtRisk ? 'text-red-400' : 'text-[#D4AF37]';

  return (
    <>
      {/* Top HUD */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
        className="fixed top-0 left-0 right-0 z-30 p-4 pointer-events-none"
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Logo / Title */}
          <div className={`${glassStyle} px-4 py-2 pointer-events-auto flex items-center gap-4`}>
            <h1 className={`font-display text-xl md:text-2xl ${textColor} tracking-wide`}>
              Project <span className="text-[#D4AF37]">Eden</span>
            </h1>

            <div className="w-px h-6 bg-current opacity-10" />

            {/* User Profile Button */}
            <button
              onClick={() => setIsProfileOpen(true)}
              className={`hover:bg-white/10 p-1.5 rounded-lg transition-colors group ${isDark ? 'text-[#F5F3EE]/50 hover:text-[#D4AF37]' : 'text-[#050505]/50 hover:text-[#D4AF37]'}`}
              title="User Profile"
            >
              <User className="w-4 h-4" />
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3">
            {/* Lighting indicator - Click to toggle theme */}
            <motion.button
              onClick={() => useGardenStore.getState().toggleTheme()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={{
                backgroundColor: themeMode === 'light'
                  ? 'rgba(255, 255, 255, 0.4)'
                  : 'rgba(212, 175, 55, 0.1)'
              }}
              className={`${glassStyle} px-3 py-2 flex items-center gap-2 pointer-events-auto cursor-pointer hover:bg-white/10 transition-colors`}
            >
              {themeMode === 'light' ? (
                <Sun className="w-4 h-4 text-[#D4AF37]" />
              ) : (
                <Moon className="w-4 h-4 text-[#D4AF37]/50" />
              )}
              <span className={`text-xs font-ui ${textMuted} hidden md:inline`}>
                {themeMode === 'light' ? 'Daylight' : 'Midnight'}
              </span>
            </motion.button>

            {/* Fog Toggle button commented out
            <motion.button
              onClick={() => useGardenStore.getState().toggleFog()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`${glassStyle} px-3 py-2 flex items-center gap-2 pointer-events-auto cursor-pointer hover:bg-white/10 transition-colors`}
              title="Toggle Fog"
            >
              <div dangerouslySetInnerHTML={{ __html: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 ${useGardenStore.getState().showFog ? (themeMode === 'light' ? 'text-[#D4AF37]' : 'text-[#D4AF37]/50') : (isDark ? 'text-[#F5F3EE]/30' : 'text-[#050505]/30')}"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 20h4"/><path d="M14 16h6"/><path d="M6 20h0v.01"/><path d="M6 16h6"/></svg>` }} />
              <span className={`text-xs font-ui ${textMuted} hidden md:inline ${!useGardenStore.getState().showFog && 'line-through opacity-50'}`}>
                Fog
              </span>
            </motion.button>
            */}

            {/* Streak with risk indicator */}
            <motion.div
              animate={{
                scale: streakAtRisk ? [1, 1.05, 1] : 1,
              }}
              transition={{ duration: 1, repeat: streakAtRisk ? Infinity : 0 }}
              className={`${glassStyle} px-3 py-2 flex items-center gap-2 pointer-events-auto`}
            >
              <motion.div
                animate={{ rotate: streak > 0 ? [0, 10, -10, 0] : 0 }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              >
                <Flame className={`w-4 h-4 ${streakAtRisk ? 'text-red-400' : streak > 0 ? 'text-[#D4AF37]' : isDark ? 'text-[#F5F3EE]/30' : 'text-[#050505]/30'}`} />
              </motion.div>
              <span className={`font-display text-lg ${streakAtRisk ? 'text-red-400' : textColor}`}>{streak}</span>
              <span className={`text-xs font-ui ${isDark ? 'text-[#F5F3EE]/50' : 'text-[#050505]/50'} hidden md:inline`}>
                {streakAtRisk ? 'at risk!' : 'day streak'}
              </span>
            </motion.div>

            {/* Plant count */}
            <div className={`${glassStyle} px-3 py-2 flex items-center gap-2 pointer-events-auto`}>
              <Leaf className="w-4 h-4 text-emerald-400" />
              <span className={`font-display text-lg ${textColor}`}>{plants.length}</span>
              <span className={`text-xs font-ui ${isDark ? 'text-[#F5F3EE]/50' : 'text-[#050505]/50'}`}>/10</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Bottom HUD */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7, type: 'spring', stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 z-30 p-4 pointer-events-none"
      >
        <div className="max-w-4xl mx-auto">
          {/* Garden progress */}
          {plants.length > 0 && (
            <div className={`${glassStyle} p-4 mb-4 pointer-events-auto`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`${isDark ? 'text-[#F5F3EE]/50' : 'text-[#050505]/50'} font-ui text-xs`}>Garden Legacy</span>
                <span className="text-[#D4AF37] font-ui text-xs">{gardenProgress}% flourishing</span>
              </div>
              <div className={`h-1 ${isDark ? 'bg-white/10' : 'bg-black/10'} rounded-full overflow-hidden`}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${gardenProgress}%` }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-[#004030] via-[#D4AF37] to-[#F5D76E] rounded-full"
                />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-center gap-6">
            {/* Add plant button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (plants.length >= 10 && subscriptionTier === 'free') {
                  setIsSubscriptionModalOpen(true);
                } else {
                  onAddPlant();
                }
              }}
              // disabled={plants.length >= 10 && subscriptionTier === 'free'}
              className={`
                relative group pointer-events-auto
                ${plants.length >= 10 && subscriptionTier === 'free' ? '' : ''}
              `}
            >
              <div className="absolute inset-0 bg-[#D4AF37] rounded-full blur-lg opacity-30 group-hover:opacity-50 transition-opacity" />
              <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8962E] flex items-center justify-center shadow-lg shadow-[#D4AF37]/30">
                <Plus className="w-7 h-7 text-[#050505]" strokeWidth={2.5} />
              </div>
            </motion.button>

            {/* Environments Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onOpenMarketplace}
              className="relative group pointer-events-auto"
            >
              <div className={`relative w-12 h-12 rounded-full ${isDark ? 'bg-white/10' : 'bg-black/10'} backdrop-blur-md flex items-center justify-center border border-white/10 group-hover:bg-white/20 transition-colors`}>
                <Globe className={`w-5 h-5 ${isDark ? 'text-[#F5F3EE]' : 'text-[#050505]'}`} />
              </div>
            </motion.button>
          </div>

          {/* Instructions */}
          {plants.length === 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className={`text-center ${isDark ? 'text-[#F5F3EE]/40' : 'text-[#050505]/40'} font-ui text-sm mt-4`}
            >
              Tap the golden button to add your first specimen
            </motion.p>
          )}

          {plants.length > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className={`text-center ${isDark ? 'text-[#F5F3EE]/40' : 'text-[#050505]/40'} font-ui text-sm mt-4`}
            >
              Tap a plant to inspect • Drag to scroll
            </motion.p>
          )}

          {/* Scroll hint indicators */}
          {plants.length > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="flex items-center justify-center gap-8 mt-4"
            >
              <motion.div
                animate={{ x: [-5, 0, -5] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className={`${isDark ? 'text-[#F5F3EE]/30' : 'text-[#050505]/30'}`}
              >
                <ChevronLeft className="w-5 h-5" />
              </motion.div>
              <span className={`${isDark ? 'text-[#F5F3EE]/20' : 'text-[#050505]/20'} font-ui text-xs`}>
                Swipe to explore
              </span>
              <motion.div
                animate={{ x: [5, 0, 5] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className={`${isDark ? 'text-[#F5F3EE]/30' : 'text-[#050505]/30'}`}
              >
                <ChevronRight className="w-5 h-5" />
              </motion.div>
            </motion.div>
          )}
        </div>
      </motion.div>

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
      />
    </>
  );
}
