import { useEffect } from 'react';
import { useGardenStore } from '@/store/gardenStore';
import { useAuth } from '@/providers/AuthProvider';

export function useGardenLogic() {
  const { session } = useAuth();
  const updatePlantHealth = useGardenStore(state => state.updatePlantHealth);
  const checkStreak = useGardenStore(state => state.checkStreak);
  const updateGrowthAnimation = useGardenStore(state => state.updateGrowthAnimation);
  const updateGamificationMetrics = useGardenStore(state => state.updateGamificationMetrics);

  // Update plant health and streaks periodically
  useEffect(() => {
    if (!session) return;

    // Initial check
    updatePlantHealth();
    checkStreak();
    updateGamificationMetrics();

    const interval = setInterval(() => {
      updatePlantHealth();
      checkStreak();
      updateGamificationMetrics();
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [session, updatePlantHealth, checkStreak, updateGamificationMetrics]);

  // Smooth growth animation loop (morph target interpolation)
  useEffect(() => {
    if (!session) return;

    // 60fps might be too much for a background logic loop, but 10fps is smooth enough for growth
    const animationInterval = setInterval(() => {
      updateGrowthAnimation();
    }, 100);

    return () => clearInterval(animationInterval);
  }, [session, updateGrowthAnimation]);
}
