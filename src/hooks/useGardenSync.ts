const toISOString = (date: Date | string | null | undefined): string | null => {
    if (!date) return null;
    if (typeof date === 'string') return date;
    return date.toISOString();
};

import { useEffect, useRef } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useGardenStore, Plant } from '@/store/gardenStore';
import { supabase } from '@/lib/supabase';

export function useGardenSync() {
    const { user } = useAuth();
    const plants = useGardenStore((state) => state.plants);
    const hasCompletedOnboarding = useGardenStore((state) => state.hasCompletedOnboarding);
    const streak = useGardenStore((state) => state.streak);
    const subscriptionTier = useGardenStore((state) => state.subscriptionTier);
    const selectedBackground = useGardenStore((state) => state.selectedBackground);

    // Ref to track if initial load is done to prevent overwriting DB with empty local state
    const isLoaded = useRef(false);

    // 1. Initial Load on Login
    useEffect(() => {
        if (!user) return;

        const loadData = async () => {
            try {
                // Load Profile (Onboarding, Streak, Sub, BG)
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (profileError && profileError.code !== 'PGRST116') {
                    console.error('Error loading profile:', profileError);
                }

                if (profile) {
                    const p = profile as any;
                    useGardenStore.setState({
                        hasCompletedOnboarding: p.has_completed_onboarding ?? false,
                        streak: p.streak ?? 0,
                        subscriptionTier: p.subscription_tier ?? 'free',
                        selectedBackground: p.selected_background ?? 'greenhouse',
                    });
                }

                // Load Plants
                const { data: plantsData, error: plantsError } = await supabase
                    .from('plants')
                    .select('*')
                    .eq('user_id', user.id);

                if (plantsError) {
                    console.error('Error loading plants:', plantsError);
                }

                if (plantsData && plantsData.length > 0) {
                    // Map DB snake_case to TS camelCase
                    const remotePlants: Plant[] = plantsData.map((p: any) => ({
                        id: p.id,
                        speciesId: p.species_id,
                        name: p.name,
                        commonName: p.common_name,
                        growthStage: p.growth_stage ?? 1,
                        health: p.health ?? 1,
                        lastWatered: p.last_watered ? new Date(p.last_watered) : null,
                        addedAt: p.added_at ? new Date(p.added_at) : new Date(),
                        position: p.position ?? 0,
                        wasNeglected: p.was_neglected ?? false,
                        previousGrowthStage: p.growth_stage ?? 1, // Reset previous to current on load
                        targetGrowthStage: p.target_growth_stage ?? 1,
                        growthAnimationSpeed: 1,
                    }));

                    // Intelligent Merge: Prefer local state if it's more recent (based on lastWatered)
                    // This prevents overwriting valid local changes with stale remote data if sync failed/lagged
                    const currentLocalPlants = useGardenStore.getState().plants;

                    const mergedPlants = remotePlants.map(remotePlant => {
                        const localPlant = currentLocalPlants.find(lp => lp.id === remotePlant.id);

                        // Debug logging for decision making
                        if (localPlant) {
                            const localTime = localPlant.lastWatered ? new Date(localPlant.lastWatered).getTime() : 0;
                            const remoteTime = remotePlant.lastWatered ? new Date(remotePlant.lastWatered).getTime() : 0;

                            if (localTime > remoteTime) {
                                return localPlant;
                            }
                            if (localPlant.growthStage > remotePlant.growthStage) {
                                return localPlant;
                            }
                        }

                        return remotePlant;
                    });

                    // Also include any local plants that aren't in remote yet (pending sync)
                    const remoteIds = new Set(remotePlants.map(p => p.id));
                    const pendingLocalPlants = currentLocalPlants.filter(p => !remoteIds.has(p.id));

                    useGardenStore.setState({ plants: [...mergedPlants, ...pendingLocalPlants] });
                }
            } catch (err) {
                console.error('Unexpected error loading garden data:', err);
            } finally {
                isLoaded.current = true;
            }
        };

        loadData();
    }, [user]);

    // 2. Sync Profile Changes (Debounced/Effect)
    useEffect(() => {
        if (!user || !isLoaded.current) return;

        const syncProfile = async () => {
            try {
                const { error } = await supabase.from('profiles').upsert({
                    id: user.id,
                    has_completed_onboarding: hasCompletedOnboarding,
                    streak: streak,
                    subscription_tier: subscriptionTier,
                    selected_background: selectedBackground,
                    updated_at: new Date().toISOString(),
                } as any);

                if (error) console.error('Error syncing profile:', error);
            } catch (err) {
                console.error('Unexpected error syncing profile:', err);
            }
        };

        syncProfile();
    }, [user, hasCompletedOnboarding, streak, subscriptionTier, selectedBackground]);

    // 3. Sync Plants (Immediate on change)
    useEffect(() => {
        if (!user || !isLoaded.current) return;

        const syncPlants = async () => {
            // Upsert all plants
            const updates = plants.map(p => ({
                id: p.id,
                user_id: user.id,
                species_id: p.speciesId,
                name: p.name,
                common_name: p.commonName,
                growth_stage: p.growthStage,
                health: p.health,
                last_watered: toISOString(p.lastWatered),
                added_at: toISOString(p.addedAt),
                position: p.position,
                was_neglected: p.wasNeglected,
                target_growth_stage: p.targetGrowthStage,
            }));

            if (updates.length > 0) {
                try {
                    const { error } = await supabase.from('plants').upsert(updates as any);
                    if (error) console.error('Error syncing plants:', error);
                } catch (err) {
                    console.error('Unexpected error syncing plants:', err);
                }
            }
        };

        syncPlants();
    }, [user, plants]);

    // 4. Syc Deletions (Efficient batch delete)
    const removedPlantIds = useGardenStore(state => state.removedPlantIds);
    const clearRemovedPlantIds = useGardenStore(state => state.clearRemovedPlantIds);

    useEffect(() => {
        if (!user || !isLoaded.current || removedPlantIds.length === 0) return;

        const syncDeletions = async () => {
            try {
                const { error } = await supabase
                    .from('plants')
                    .delete()
                    .in('id', removedPlantIds)
                    .eq('user_id', user.id); // Security check

                if (error) {
                    console.error('Error syncing deletions:', error);
                } else {
                    // Only clear from local state if DB delete was successful
                    clearRemovedPlantIds(removedPlantIds);
                }
            } catch (err) {
                console.error('Unexpected error syncing deletions:', err);
            }
        };

        syncDeletions();
    }, [user, removedPlantIds, clearRemovedPlantIds]);
}
