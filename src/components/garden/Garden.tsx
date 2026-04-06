import { useState, useEffect, useCallback } from 'react';
import { useGardenStore } from '@/store/gardenStore';
import { OnboardingFlow } from '../onboarding/OnboardingFlow';
import { GardenScene } from './GardenScene'; // Assuming named export, will verify
import { GardenHUD } from './GardenHUD';
import { AddPlantModal } from './AddPlantModal';
import { PlantInspector } from './PlantInspector';
import { useLuxurySound } from '@/hooks/useLuxurySound';
import { useNotifications } from '@/hooks/useNotifications';

import { BackgroundMarketplace } from './BackgroundMarketplace';

export const Garden = () => {
    const hasCompletedOnboarding = useGardenStore(state => state.hasCompletedOnboarding);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(false);

    // Integrate robust features
    const { playAmbient } = useLuxurySound();
    const { requestPermission } = useNotifications();

    useEffect(() => {
        // Start ambient sound on mount (user interaction required normally, but we init)
        const cleanup = () => { };
        return cleanup;
    }, []);

    const themeMode = useGardenStore(state => state.themeMode);
    const selectedPlantId = useGardenStore(state => state.selectedPlantId);

    // If onboarding not complete, show onboarding flow
    if (!hasCompletedOnboarding) {
        return <OnboardingFlow onComplete={() => requestPermission()} />;
    }

    const handlePlantSelect = useCallback((id: string) => {
        useGardenStore.getState().selectPlant(id);
        useGardenStore.getState().setInspecting(true);
    }, []);

    return (
        <div className={`relative w-full h-full overflow-hidden transition-colors duration-1000 ${themeMode === 'light' ? 'bg-[#F5F3EE]' : 'bg-[#050505]'}`}>
            {/* The Main 3D Scene */}
            <div className="absolute inset-0 z-0">
                <GardenScene
                    themeMode={themeMode}
                    onPlantSelect={handlePlantSelect}
                />
            </div>

            {/* UI Overlay */}
            <div className="relative z-10 pointer-events-none w-full h-full">
                <GardenHUD
                    onAddPlant={() => setIsAddModalOpen(true)}
                    onOpenMarketplace={() => setIsMarketplaceOpen(true)}
                />
                {selectedPlantId && (
                    <PlantInspector
                        plantId={selectedPlantId}
                        onClose={() => {
                            useGardenStore.getState().setInspecting(false);
                            useGardenStore.getState().selectPlant(null);
                        }}
                    />
                )}
            </div>

            {/* Modals */}
            <AddPlantModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />
            <BackgroundMarketplace
                isOpen={isMarketplaceOpen}
                onClose={() => setIsMarketplaceOpen(false)}
            />
        </div>
    );
};
