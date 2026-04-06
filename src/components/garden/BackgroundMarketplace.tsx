import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Check } from 'lucide-react';
import { useGardenStore } from '@/store/gardenStore';
import { GlassPanel } from '@/components/ui/glass-panel';
import { SubscriptionModal } from './SubscriptionModal';
import { useClickOutside } from '@/hooks/useClickOutside';

interface BackgroundMarketplaceProps {
    isOpen: boolean;
    onClose: () => void;
}

const BACKGROUNDS = [
    {
        id: 'none',
        name: 'None',
        description: 'A clean, empty void for pure focus on your plants.',
        type: 'free',
        color: '#050505'
    },
    {
        id: 'greenhouse',
        name: 'Classical Greenhouse',
        description: 'A Victorian-style glass structure filled with diffuse light.',
        type: 'free',
        color: '#1A1A1A'
    },
    {
        id: 'garden',
        name: 'Royal Gardens',
        description: 'Open air raised beds surrounded by manicured hedges.',
        type: 'pro',
        color: '#2A3A2A'
    },
    {
        id: 'forest',
        name: 'Misty Forest',
        description: 'Deep woodland with towering ancient trees and fog.',
        type: 'pro',
        color: '#0A1A0A'
    },
    {
        id: 'farm',
        name: 'Rustic Farm',
        description: 'A quiet countryside setting with wooden structures.',
        type: 'pro',
        color: '#3A2A1A'
    }
] as const;

export const BackgroundMarketplace = ({ isOpen, onClose }: BackgroundMarketplaceProps) => {
    const { selectedBackground, subscriptionTier, setBackground } = useGardenStore();
    const [showSubscription, setShowSubscription] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);

    useClickOutside(modalRef, () => {
        if (isOpen && !showSubscription) {
            onClose();
        }
    });

    const handleSelect = (bg: any) => {
        if (bg.type === 'pro' && subscriptionTier === 'free') {
            setShowSubscription(true);
            return;
        }
        setBackground(bg.id);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                <motion.div
                    ref={modalRef}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-4xl"
                >
                    <GlassPanel className="p-0 overflow-hidden h-[80vh] flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-display text-white">Environments</h2>
                                <p className="text-white/50 text-sm">Choose the perfect setting for your collection.</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                            >
                                <X className="w-6 h-6 text-white/70" />
                            </button>
                        </div>

                        {/* Grid */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {BACKGROUNDS.map((bg) => (
                                    <button
                                        key={bg.id}
                                        onClick={() => handleSelect(bg)}
                                        className={`group relative aspect-video rounded-xl overflow-hidden border-2 transition-all text-left
                                            ${selectedBackground === bg.id
                                                ? 'border-yellow-500 shadow-[0_0_30px_-5px_rgba(234,179,8,0.3)]'
                                                : 'border-white/5 hover:border-white/20'
                                            }`}
                                    >
                                        {/* Placeholder Background Color/Image */}
                                        <div
                                            className="absolute inset-0 transition-transform duration-700 group-hover:scale-110"
                                            style={{ backgroundColor: bg.color }}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                        </div>

                                        {/* Content */}
                                        <div className="absolute inset-0 p-6 flex flex-col justify-end">
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <h3 className="text-xl font-bold text-white mb-1 group-hover:text-yellow-200 transition-colors">
                                                        {bg.name}
                                                    </h3>
                                                    <p className="text-white/60 text-sm max-w-[80%]">
                                                        {bg.description}
                                                    </p>
                                                </div>

                                                {/* Status Icon */}
                                                <div>
                                                    {bg.type === 'pro' && subscriptionTier === 'free' ? (
                                                        <div className="p-2 bg-black/50 backdrop-blur-md rounded-full border border-white/10">
                                                            <Lock className="w-5 h-5 text-white/50" />
                                                        </div>
                                                    ) : selectedBackground === bg.id ? (
                                                        <div className="p-2 bg-yellow-500 rounded-full text-black shadow-lg">
                                                            <Check className="w-5 h-5" />
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Pro Badge */}
                                        {bg.type === 'pro' && (
                                            <div className="absolute top-4 left-4 px-2 py-1 rounded bg-black/50 backdrop-blur-md border border-yellow-500/30 text-yellow-500 text-[10px] font-bold uppercase tracking-wider">
                                                Pro
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </GlassPanel>
                </motion.div>

                {/* Nested Subscription Modal */}
                <SubscriptionModal
                    isOpen={showSubscription}
                    onClose={() => setShowSubscription(false)}
                />
            </div>
        </AnimatePresence>
    );
};
