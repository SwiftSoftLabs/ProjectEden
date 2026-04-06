import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Star, Zap, Globe, Lock } from 'lucide-react';
import { useGardenStore } from '@/store/gardenStore';
import { GlassPanel } from '@/components/ui/glass-panel';
import { GlassText } from '@/components/ui/glass-text';
import { useClickOutside } from '@/hooks/useClickOutside';

interface SubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SubscriptionModal = ({ isOpen, onClose }: SubscriptionModalProps) => {
    const setSubscriptionTier = useGardenStore(state => state.setSubscriptionTier);
    const modalRef = useRef<HTMLDivElement>(null);

    useClickOutside(modalRef, () => {
        if (isOpen) {
            onClose();
        }
    });

    // Mock payment processing
    const handleSubscribe = async () => {
        // In a real app, this would trigger Stripe/LemonSqueezy flow
        // simulate delay
        const button = document.getElementById('subscribe-btn');
        if (button) button.innerText = 'Processing...';

        setTimeout(() => {
            setSubscriptionTier('pro');
            onClose();
            alert('Welcome to Pro! You now have unlimited plants and access to exclusive backgrounds.');
        }, 1500);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    ref={modalRef}
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-md"
                >
                    <GlassPanel className="p-0 overflow-hidden border-yellow-500/30 shadow-[0_0_50px_-10px_rgba(234,179,8,0.3)]">
                        {/* Header */}
                        <div className="relative h-32 bg-gradient-to-br from-yellow-600/20 to-amber-900/40 p-6 flex flex-col justify-end">
                            <div className="absolute top-4 right-4">
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                                >
                                    <X className="w-5 h-5 text-white/70" />
                                </button>
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                                <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                                <span className="text-yellow-500 font-bold tracking-wider text-sm uppercase">Project Eden Pro</span>
                            </div>
                            <h2 className="text-3xl font-display text-white">Unlock Full Access</h2>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="p-2 rounded-lg bg-green-500/20 mt-1">
                                        <Zap className="w-5 h-5 text-green-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-medium text-lg">Unlimited Plants</h3>
                                        <p className="text-white/60 text-sm">Remove the 10-plant limit and grow your garden without boundaries.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="p-2 rounded-lg bg-blue-500/20 mt-1">
                                        <Globe className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-medium text-lg">Exclusive Environments</h3>
                                        <p className="text-white/60 text-sm">Transport your garden to the Forest, Farm, or Outdoor Garden.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Plans */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10 opacity-50">
                                    <h4 className="text-white/70 font-medium">Free</h4>
                                    <div className="text-2xl font-bold text-white mt-1">$0<span className="text-sm font-normal text-white/50">/mo</span></div>
                                    <ul className="mt-3 space-y-2 text-xs text-white/60">
                                        <li className="flex items-center gap-2"><Check className="w-3 h-3" /> 10 Plants Max</li>
                                        <li className="flex items-center gap-2"><Check className="w-3 h-3" /> Greenhouse Only</li>
                                    </ul>
                                </div>
                                <div className="relative p-4 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-900/20 border border-yellow-500/30">
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-yellow-500 text-black text-[10px] font-bold rounded-full uppercase tracking-wider">
                                        Most Popular
                                    </div>
                                    <h4 className="text-yellow-200 font-medium">Pro</h4>
                                    <div className="text-2xl font-bold text-white mt-1">$9.99<span className="text-sm font-normal text-white/50">/mo</span></div>
                                    <ul className="mt-3 space-y-2 text-xs text-white/80">
                                        <li className="flex items-center gap-2"><Check className="w-3 h-3 text-yellow-500" /> Unlimited Plants</li>
                                        <li className="flex items-center gap-2"><Check className="w-3 h-3 text-yellow-500" /> All Environments</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Action */}
                            <button
                                id="subscribe-btn"
                                onClick={handleSubscribe}
                                className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-lg rounded-xl transition-all active:scale-95 shadow-[0_0_20px_rgba(234,179,8,0.3)]"
                            >
                                Upgrade to Pro
                            </button>
                            <p className="text-center text-xs text-white/30">
                                Cancel anytime. Secure payment handled by MockPay™.
                            </p>
                        </div>
                    </GlassPanel>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
