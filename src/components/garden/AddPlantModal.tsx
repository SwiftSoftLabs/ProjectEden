import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Droplets, Gem, ChevronDown, Lock, Search } from 'lucide-react';
import { useGardenStore, PLANT_SPECIES, PlantSpecies } from '@/store/gardenStore';
import { SubscriptionModal } from './SubscriptionModal';
import { useClickOutside } from '@/hooks/useClickOutside';

interface AddPlantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function PlantCard({
  species,
  isOwned,
  onSelect,
  isDisabled
}: {
  species: PlantSpecies;
  isOwned: boolean;
  onSelect: () => void;
  isDisabled: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);

  const now = new Date();
  const isSummer = now.getMonth() >= 3 && now.getMonth() <= 8;
  const frequency = isSummer ? species.wateringFrequencySummer : species.wateringFrequencyWinter;

  // Format frequency text
  const frequencyText = frequency < 1
    ? `${Math.round(frequency * 24 * 60)}m`
    : `${frequency}d`;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: isDisabled ? 1 : 1.02 }}
      whileTap={{ scale: isDisabled ? 1 : 0.98 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onSelect}
      disabled={isDisabled}
      className={`
        w-full relative glass-panel p-4 text-left transition-all duration-300 overflow-hidden h-full flex flex-col
        ${isDisabled ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:ring-1 hover:ring-[#D4AF37]/50 cursor-pointer'}
      `}
    >
      {/* Shimmer effect on hover */}
      <AnimatePresence>
        {isHovered && !isDisabled && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Rarity badge */}
      <div className={`
        absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-ui uppercase tracking-wider z-10
        ${species.rarity === 'legendary' ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : ''}
        ${species.rarity === 'ultra-rare' ? 'bg-purple-500/20 text-purple-400' : ''}
        ${species.rarity === 'rare' ? 'bg-emerald-500/20 text-emerald-400' : ''}
      `}>
        {species.rarity}
      </div>

      {/* Plant icon/image */}
      <div
        className="w-full h-32 rounded-xl mb-4 flex items-center justify-center relative overflow-hidden flex-shrink-0"
        style={{ backgroundColor: species.color + '20' }}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${species.color}40 0%, transparent 60%)`
          }}
        />
        <Sparkles
          className="w-12 h-12 relative z-10"
          style={{ color: species.color }}
        />

        {isOwned && (
          <div className="absolute top-2 left-2 bg-black/60 rounded px-1.5 py-0.5 z-10">
            <span className="text-[#F5F3EE]/80 font-ui text-[10px]">Owned</span>
          </div>
        )}
      </div>

      {/* Plant info */}
      <h3 className="font-display text-lg text-[#F5F3EE] leading-tight mb-1 line-clamp-1">
        {species.commonName}
      </h3>
      <p className="text-[10px] text-[#F5F3EE]/40 font-ui italic mb-3 truncate">
        {species.name}
      </p>

      {/* Stats row */}
      <div className="mt-auto flex items-center gap-3 text-[#F5F3EE]/50">
        <div className="flex items-center gap-1">
          <Droplets className="w-3 h-3" />
          <span className="text-[10px] font-ui">{frequencyText}</span>
        </div>
        <div className="flex items-center gap-1">
          <Gem className="w-3 h-3 text-[#D4AF37]" />
          <span className="text-[10px] font-ui text-[#D4AF37]">{species.value}</span>
        </div>
      </div>
    </motion.button>
  );
}

export function AddPlantModal({ isOpen, onClose }: AddPlantModalProps) {
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  const plants = useGardenStore(state => state.plants);
  const addPlant = useGardenStore(state => state.addPlant);
  const subscriptionTier = useGardenStore(state => state.subscriptionTier);

  const ownedSpeciesIds = plants.map(p => p.speciesId);
  const isLimitReached = subscriptionTier === 'free' && plants.length >= 10;

  useClickOutside(modalRef, () => {
    if (isOpen && !showSubscription && !isAdding) {
      onClose();
    }
  });

  const filteredSpecies = PLANT_SPECIES.filter(species =>
    species.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    species.commonName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (speciesId: string) => {
    if (isLimitReached) {
      setShowSubscription(true);
      return;
    }

    setSelectedSpecies(speciesId);
    setIsAdding(true);

    setTimeout(() => {
      addPlant(speciesId);
      setIsAdding(false);
      setSelectedSpecies(null);
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative glass-panel p-6 max-w-5xl w-full h-[85vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6 shrink-0">
            <div>
              <h2 className="font-display text-2xl md:text-3xl text-[#F5F3EE]">
                Expand Your Collection
              </h2>
              <p className="text-[#F5F3EE]/50 font-ui text-sm mt-1">
                {plants.length}/10 specimens (Free Tier)
              </p>
            </div>

            <div className="flex items-center gap-4">
              {isLimitReached && (
                <button
                  onClick={() => setShowSubscription(true)}
                  className="hidden md:flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-yellow-500 text-xs font-bold uppercase tracking-wider hover:bg-yellow-500/20 transition-colors"
                >
                  <Lock className="w-3 h-3" />
                  Unlock Unlimited
                </button>
              )}
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5 text-[#F5F3EE]" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6 relative shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type="text"
              placeholder="Search metadata..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>

          {/* Upsell Banner (Mobile/Inline) */}
          {isLimitReached && (
            <button
              onClick={() => setShowSubscription(true)}
              className="mb-6 p-4 rounded-xl bg-gradient-to-r from-yellow-900/20 to-black border border-yellow-500/30 flex items-center justify-between group hover:border-yellow-500/50 transition-all text-left shrink-0"
            >
              <div>
                <h3 className="text-lg font-bold text-yellow-500 mb-1">Garden Capacity Reached</h3>
                <p className="text-white/60 text-sm">Upgrade to Pro for unlimited plants.</p>
              </div>
              <div className="px-4 py-2 bg-yellow-500 text-black font-bold rounded-lg group-hover:bg-yellow-400 transition-colors text-sm">
                Upgrade
              </div>
            </button>
          )}

          {/* Plant grid */}
          <div className="flex-1 overflow-y-auto pr-2 -mr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-10">
              {filteredSpecies.map((species, index) => (
                <motion.div
                  key={species.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="h-full"
                >
                  <PlantCard
                    species={species}
                    isOwned={ownedSpeciesIds.includes(species.id)}
                    isDisabled={isLimitReached}
                    onSelect={() => handleSelect(species.id)}
                  />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Adding overlay */}
          <AnimatePresence>
            {isAdding && selectedSpecies && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-20 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ duration: 0.5 }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-[#D4AF37] rounded-full blur-3xl opacity-30 animate-pulse" />
                  <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8962E] flex items-center justify-center">
                    <Sparkles className="w-12 h-12 text-[#050505]" />
                  </div>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="font-display text-2xl text-[#F5F3EE] mt-6"
                >
                  Materializing Specimen...
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          <SubscriptionModal isOpen={showSubscription} onClose={() => setShowSubscription(false)} />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
