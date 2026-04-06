import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Plant {
  id: string;
  speciesId: string;
  name: string;
  commonName: string;
  growthStage: number; // 1-30
  health: number; // 0-1
  lastWatered: Date | null;
  addedAt: Date;
  position: number; // Position in gallery
  wasNeglected: boolean; // Track if plant was recently neglected for recovery animation
  previousGrowthStage: number; // For morph target interpolation
  targetGrowthStage: number; // Target stage for smooth transitions
  growthAnimationSpeed: number; // 1 = normal, 2 = recovery speed
}

export interface PlantSpecies {
  id: string;
  name: string;
  commonName: string;
  description: string;
  wateringFrequencySummer: number; // days
  wateringFrequencyWinter: number; // days
  rarity: 'rare' | 'ultra-rare' | 'legendary';
  value: string;
  color: string;
}

export const PLANT_SPECIES: PlantSpecies[] = [
  {
    id: 'monstera-albo',
    name: 'Monstera deliciosa Albo Variegata',
    commonName: 'Variegated Monstera',
    description: 'The quintessential status symbol with distinct white/green marbling.',
    wateringFrequencySummer: 8,
    wateringFrequencyWinter: 17,
    rarity: 'ultra-rare',
    value: '$3,000+',
    color: '#4A7C59',
  },
  {
    id: 'spiritus-sancti',
    name: 'Philodendron spiritus sancti',
    commonName: 'Spirit of the Holy Ghost',
    description: 'Extremely rare, endangered, and highly coveted.',
    wateringFrequencySummer: 6,
    wateringFrequencyWinter: 12,
    rarity: 'legendary',
    value: '$10,000+',
    color: '#2D5A3D',
  },
  {
    id: 'fiddle-leaf',
    name: 'Ficus lyrata',
    commonName: 'Fiddle Leaf Fig',
    description: 'Architectural staple requiring precise care.',
    wateringFrequencySummer: 7,
    wateringFrequencyWinter: 14,
    rarity: 'rare',
    value: '$500+',
    color: '#3D6B4F',
  },
  {
    id: 'obliqua',
    name: 'Monstera obliqua Peru',
    commonName: 'Obliqua',
    description: 'Known for extreme fenestration—more hole than leaf.',
    wateringFrequencySummer: 5,
    wateringFrequencyWinter: 10,
    rarity: 'legendary',
    value: '$8,000+',
    color: '#5A8A6A',
  },
  {
    id: 'pink-princess',
    name: 'Philodendron erubescens',
    commonName: 'Pink Princess',
    description: 'High-contrast black and pink foliage.',
    wateringFrequencySummer: 7,
    wateringFrequencyWinter: 14,
    rarity: 'ultra-rare',
    value: '$1,500+',
    color: '#8B4A6B',
  },
  {
    id: 'musa-aeae',
    name: 'Musa aeae',
    commonName: 'Variegated Banana',
    description: 'Massive, architectural leaves with dynamic movement.',
    wateringFrequencySummer: 3,
    wateringFrequencyWinter: 7,
    rarity: 'ultra-rare',
    value: '$2,000+',
    color: '#6B8E4E',
  },
  {
    id: 'queen-anthurium',
    name: 'Anthurium warocqueanum',
    commonName: 'Queen Anthurium',
    description: 'Velvet-leaf texture with stunning silver veins.',
    wateringFrequencySummer: 5,
    wateringFrequencyWinter: 10,
    rarity: 'ultra-rare',
    value: '$2,500+',
    color: '#2E4A3A',
  },
  {
    id: 'titanota',
    name: 'Agave titanota',
    commonName: 'Titanota',
    description: 'Geometric perfection in structural minimalism.',
    wateringFrequencySummer: 14,
    wateringFrequencyWinter: 30,
    rarity: 'rare',
    value: '$800+',
    color: '#7A9A8A',
  },
  {
    id: 'raven-zz',
    name: 'Zamioculcas zamiifolia Raven',
    commonName: 'Raven ZZ',
    description: 'Jet black foliage offering dramatic contrast.',
    wateringFrequencySummer: 21,
    wateringFrequencyWinter: 45,
    rarity: 'rare',
    value: '$200+',
    color: '#0A0F0A',
  },
  {
    id: 'shimpaku-bonsai',
    name: 'Juniperus chinensis',
    commonName: 'Shimpaku Bonsai',
    description: 'Symbol of patience, cultivation, and time.',
    wateringFrequencySummer: 1,
    wateringFrequencyWinter: 3,
    rarity: 'legendary',
    value: '$5,000+',
    color: '#3A5A4A',
  },
  {
    id: 'maidenhair-fern',
    name: 'Adiantum raddianum',
    commonName: 'Maidenhair Fern',
    description: 'Delicate, lacy foliage that demands high humidity and constant moisture.',
    wateringFrequencySummer: 1,
    wateringFrequencyWinter: 2,
    rarity: 'rare',
    value: '$45+',
    color: '#90EE90',
  },
  {
    id: 'calathea-orbifolia',
    name: 'Goeppertia orbifolia',
    commonName: 'Calathea Orbifolia',
    description: 'Stunning round leaves with silver stripes. A true diva regarding water quality.',
    wateringFrequencySummer: 2,
    wateringFrequencyWinter: 4,
    rarity: 'rare',
    value: '$65+',
    color: '#98FB98',
  },
  {
    id: 'test-plant',
    name: 'Debug Plant',
    commonName: 'Test Plant',
    description: 'A rapid-cycle plant for testing watering mechanics. Thirsty every 10 minutes.',
    wateringFrequencySummer: 0.007, // ~10 minutes
    wateringFrequencyWinter: 0.007,
    rarity: 'rare',
    value: '$0',
    color: '#FF00FF',
  },

  {
    id: 'test-plant-fast',
    name: 'Debug Plant Fast',
    commonName: 'Test Plant (Fast)',
    description: 'Extremely rapid-cycle plant. Thirsty every 1 minute.',
    wateringFrequencySummer: 0.000694, // ~1 minute (1/1440)
    wateringFrequencyWinter: 0.000694,
    rarity: 'legendary',
    value: '$0',
    color: '#00FFFF',
  },
];

interface GardenState {
  plants: Plant[];
  removedPlantIds: string[];
  streak: number;
  lastStreakDate: Date | null;
  hasCompletedOnboarding: boolean;
  selectedPlantId: string | null;
  isInspecting: boolean;
  lightingMode: 'golden' | 'twilight';
  isAuthenticated: boolean;
  userEmail: string | null;
  themeMode: 'dark' | 'light';
  subscriptionTier: 'free' | 'pro';
  selectedBackground: 'greenhouse' | 'garden' | 'forest' | 'farm' | 'none';
  // showFog: boolean;

  // Gamification metrics
  rootNetworkExpansion: number; // 0-1, based on streak
  careConsistency: number; // 0-1, based on plant health average

  // Actions
  addPlant: (speciesId: string) => void;
  removePlant: (plantId: string) => void;
  clearRemovedPlantIds: (ids: string[]) => void;
  waterPlant: (plantId: string) => void;
  selectPlant: (plantId: string | null) => void;
  setInspecting: (inspecting: boolean) => void;
  completeOnboarding: () => void;
  updatePlantHealth: () => void;
  checkStreak: () => void;
  signIn: (email: string) => void;
  signOut: () => void;
  resetGarden: () => void;
  toggleTheme: () => void;
  setSubscriptionTier: (tier: 'free' | 'pro') => void;
  setBackground: (bg: 'greenhouse' | 'garden' | 'forest' | 'farm' | 'none') => void;
  // toggleFog: () => void;
  updateGrowthAnimation: () => void; // Smooth morph target interpolation
  getWateringSchedule: (plantId: string) => { daysUntil: number; frequency: number; isOverdue: boolean };
  updateGamificationMetrics: () => void; // Update root network and care consistency
}

const generateId = () => crypto.randomUUID();

export const useGardenStore = create<GardenState>()(
  persist(
    (set, get) => ({
      plants: [],
      removedPlantIds: [],
      streak: 0,
      lastStreakDate: null,
      hasCompletedOnboarding: false,
      selectedPlantId: null,
      isInspecting: false,
      lightingMode: 'golden',
      isAuthenticated: false,
      userEmail: null,
      themeMode: 'dark',
      subscriptionTier: 'free',
      selectedBackground: 'greenhouse',
      // showFog: true,
      rootNetworkExpansion: 0,
      careConsistency: 1,

      setSubscriptionTier: (tier) => set({ subscriptionTier: tier }),
      setBackground: (bg) => set({ selectedBackground: bg }),
      // toggleFog: () => set((state) => ({ showFog: !state.showFog })),

      addPlant: (speciesId: string) => {
        const species = PLANT_SPECIES.find(s => s.id === speciesId);
        if (!species) return;

        const { plants, subscriptionTier } = get();
        // Limit check
        if (subscriptionTier === 'free' && plants.length >= 10) return;

        const newPlant: Plant = {
          id: generateId(),
          speciesId,
          name: species.name,
          commonName: species.commonName,
          growthStage: 1,
          health: 1,
          lastWatered: new Date(),
          addedAt: new Date(),
          position: plants.length,
          wasNeglected: false,
          previousGrowthStage: 0,
          targetGrowthStage: 1,
          growthAnimationSpeed: 1,
        };

        set({ plants: [...plants, newPlant] });
      },

      removePlant: (plantId: string) => {
        const { plants, removedPlantIds } = get();
        set({
          plants: plants.filter(p => p.id !== plantId),
          removedPlantIds: [...removedPlantIds, plantId]
        });
      },

      clearRemovedPlantIds: (ids: string[]) => {
        const { removedPlantIds } = get();
        set({
          removedPlantIds: removedPlantIds.filter(id => !ids.includes(id))
        });
      },

      waterPlant: (plantId: string) => {
        const { plants, streak, lastStreakDate } = get();
        const now = new Date();

        set({
          plants: plants.map(p => {
            if (p.id !== plantId) return p;

            const wasNeglected = p.health < 0.5;
            // Increase growth by 1 stage per watering as per user request
            const newTargetStage = Math.min(30, p.targetGrowthStage + 1);

            return {
              ...p,
              lastWatered: now,
              health: 1,
              previousGrowthStage: p.growthStage,
              targetGrowthStage: newTargetStage,
              wasNeglected,
              // 2x speed recovery animation if plant was neglected
              growthAnimationSpeed: wasNeglected ? 2 : 1,
            };
          }),
        });

        // Update streak
        const today = new Date().toDateString();
        const lastDate = lastStreakDate ? new Date(lastStreakDate).toDateString() : null;

        if (lastDate !== today) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);

          if (lastDate === yesterday.toDateString()) {
            set({ streak: streak + 1, lastStreakDate: now });
          } else if (lastDate !== today) {
            set({ streak: 1, lastStreakDate: now });
          }
        }
      },

      selectPlant: (plantId: string | null) => {
        set({ selectedPlantId: plantId });
      },

      setInspecting: (inspecting: boolean) => {
        set({ isInspecting: inspecting });
      },

      completeOnboarding: () => {
        set({ hasCompletedOnboarding: true });
      },

      updatePlantHealth: () => {
        const { plants } = get();
        const now = new Date();
        const isSummer = now.getMonth() >= 3 && now.getMonth() <= 8;

        let hasAtRiskPlant = false;

        const updatedPlants = plants.map(plant => {
          const species = PLANT_SPECIES.find(s => s.id === plant.speciesId);
          if (!species || !plant.lastWatered) return plant;

          // Use floating point days for precision
          const daysSinceWatered = (now.getTime() - new Date(plant.lastWatered).getTime()) / (1000 * 60 * 60 * 24);

          const frequency = isSummer
            ? species.wateringFrequencySummer
            : species.wateringFrequencyWinter;

          // More nuanced health decay based on species-specific schedule
          const overdueRatio = daysSinceWatered / frequency;
          let healthDecay = 1;

          if (overdueRatio <= 1) {
            // Within schedule - healthy
            healthDecay = 1;
          } else if (overdueRatio <= 1.5) {
            // Slightly overdue - minor stress
            healthDecay = 1 - (overdueRatio - 1) * 0.4;
          } else if (overdueRatio <= 2) {
            // Moderately overdue - visible stress
            healthDecay = 0.8 - (overdueRatio - 1.5) * 0.6;
          } else {
            // Severely overdue - critical
            healthDecay = Math.max(0.1, 0.5 - (overdueRatio - 2) * 0.2);
          }

          if (healthDecay < 0.5) hasAtRiskPlant = true;

          // Reverse growth animation when severely neglected
          let newTargetStage = plant.targetGrowthStage;
          let newGrowthStage = plant.growthStage;

          if (overdueRatio > 2) {
            // Regress growth stage - reverse animation
            const stagesLost = Math.floor((overdueRatio - 2) * 0.5);
            newTargetStage = Math.max(1, plant.targetGrowthStage - stagesLost);

            // If target is lower than current, trigger reverse animation
            if (newTargetStage < plant.growthStage) {
              newGrowthStage = plant.growthStage; // Keep current for smooth transition
            }
          }

          return {
            ...plant,
            health: healthDecay,
            targetGrowthStage: newTargetStage,
            growthStage: newGrowthStage,
            wasNeglected: overdueRatio > 1.5,
          };
        });

        set({
          plants: updatedPlants,
          lightingMode: hasAtRiskPlant ? 'twilight' : 'golden',
        });
      },

      checkStreak: () => {
        const { lastStreakDate } = get();
        if (!lastStreakDate) return;

        const now = new Date();
        const lastDate = new Date(lastStreakDate);
        const daysDiff = Math.floor(
          (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff > 1) {
          set({ streak: 0, lightingMode: 'twilight' });
        }
      },

      signIn: (email: string) => {
        set({
          isAuthenticated: true,
          userEmail: email
        });
      },

      signOut: () => {
        set({
          isAuthenticated: false,
          userEmail: null
        });
      },

      resetGarden: () => {
        set({
          plants: [],
          streak: 0,
          lastStreakDate: null,
          hasCompletedOnboarding: false,
          selectedPlantId: null,
          isInspecting: false,
          lightingMode: 'golden',
        });
      },

      toggleTheme: () => {
        set((state) => ({
          themeMode: state.themeMode === 'dark' ? 'light' : 'dark',
        }));
      },

      // Smooth morph target interpolation for growth animations
      updateGrowthAnimation: () => {
        const { plants } = get();

        const updatedPlants = plants.map(plant => {
          // Skip if already at target
          if (plant.growthStage === plant.targetGrowthStage) {
            return {
              ...plant,
              wasNeglected: false,
              growthAnimationSpeed: 1,
            };
          }

          // Calculate interpolation step based on animation speed
          // tuned to 0.015 so 3 stages take ~3.3s (200 frames @ 60fps)
          const step = 0.015 * plant.growthAnimationSpeed;

          let newGrowthStage: number;
          if (plant.growthStage < plant.targetGrowthStage) {
            // Growing
            newGrowthStage = Math.min(
              plant.targetGrowthStage,
              plant.growthStage + step
            );
          } else {
            // Withering (reverse animation)
            newGrowthStage = Math.max(
              plant.targetGrowthStage,
              plant.growthStage - step * 0.5 // Slower wither
            );
          }

          return {
            ...plant,
            previousGrowthStage: plant.growthStage,
            growthStage: newGrowthStage,
          };
        });

        set({ plants: updatedPlants });
      },

      // Get species-specific watering schedule
      getWateringSchedule: (plantId: string) => {
        const { plants } = get();
        const plant = plants.find(p => p.id === plantId);

        if (!plant || !plant.lastWatered) {
          return { daysUntil: 0, frequency: 7, isOverdue: true };
        }

        const species = PLANT_SPECIES.find(s => s.id === plant.speciesId);
        if (!species) {
          return { daysUntil: 0, frequency: 7, isOverdue: true };
        }

        const now = new Date();
        const isSummer = now.getMonth() >= 3 && now.getMonth() <= 8;
        const frequency = isSummer
          ? species.wateringFrequencySummer
          : species.wateringFrequencyWinter;

        // Use floating point for precision (needed for test plants with minute-based schedules)
        const daysSinceWatered = (now.getTime() - new Date(plant.lastWatered).getTime()) / (1000 * 60 * 60 * 24);

        const daysUntil = Math.max(0, frequency - daysSinceWatered);
        const isOverdue = daysSinceWatered >= frequency;

        return { daysUntil, frequency, isOverdue };
      },

      // Update gamification metrics based on streak and plant health
      updateGamificationMetrics: () => {
        const { plants, streak } = get();

        // Root network expansion based on streak (0-1)
        // Max expansion at 30-day streak
        const rootNetworkExpansion = Math.min(1, streak / 30);

        // Care consistency based on average plant health
        let careConsistency = 1;
        if (plants.length > 0) {
          const avgHealth = plants.reduce((sum, p) => sum + p.health, 0) / plants.length;
          careConsistency = avgHealth;
        }

        set({ rootNetworkExpansion, careConsistency });
      },
    }),
    {
      name: 'project-eden-garden',
      partialize: (state) => ({
        plants: state.plants,
        streak: state.streak,
        lastStreakDate: state.lastStreakDate,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        isAuthenticated: state.isAuthenticated,
        userEmail: state.userEmail,
        themeMode: state.themeMode,
        // showFog: state.showFog,
      }),
    }
  )
);
