import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Droplets, Clock, Gem } from 'lucide-react';
import { useGardenStore, PLANT_SPECIES, PlantSpecies } from '@/store/gardenStore';

interface AddPlantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function PlantCard({ 
  species, 
  isOwned, 
  onSelect 
}: { 
  species: PlantSpecies; 
  isOwned: boolean;
  onSelect: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onSelect}
      disabled={isOwned}
      className={`
        relative glass-panel p-4 text-left transition-all duration-300 overflow-hidden
        ${isOwned 
          ? 'opacity-50 cursor-not-allowed' 
          : 'hover:ring-1 hover:ring-[#D4AF37]/50 cursor-pointer'
        }
      `}
    >
      {/* Shimmer effect on hover */}
      <AnimatePresence>
        {isHovered && !isOwned && (
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
        absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-ui uppercase tracking-wider
        ${species.rarity === 'legendary' ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : ''}
        ${species.rarity === 'ultra-rare' ? 'bg-purple-500/20 text-purple-400' : ''}
        ${species.rarity === 'rare' ? 'bg-emerald-500/20 text-emerald-400' : ''}
      `}>
        {species.rarity}
      </div>
      
      {/* Plant icon */}
      <div 
        className="w-full aspect-square rounded-xl mb-4 flex items-center justify-center relative overflow-hidden"
        style={{ backgroundColor: species.color + '20' }}
      >
        <div 
          className="absolute inset-0 opacity-30"
          style={{ 
            background: `radial-gradient(circle at 30% 30%, ${species.color}40 0%, transparent 60%)`
          }}
        />
        <Sparkles 
          className="w-16 h-16 relative z-10" 
          style={{ color: species.color }} 
        />
        
        {isOwned && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-[#F5F3EE]/80 font-ui text-sm">Owned</span>
          </div>
        )}
      </div>
      
      {/* Plant info */}
      <h3 className="font-display text-lg text-[#F5F3EE] leading-tight mb-1">
        {species.commonName}
      </h3>
      <p className="text-[10px] text-[#F5F3EE]/40 font-ui italic mb-3 truncate">
        {species.name}
      </p>
      
      {/* Stats row */}
      <div className="flex items-center gap-3 text-[#F5F3EE]/50">
        <div className="flex items-center gap-1">
          <Droplets className="w-3 h-3" />
          <span className="text-[10px] font-ui">{species.wateringFrequencySummer}d</span>
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
  
  const plants = useGardenStore(state => state.plants);
  const addPlant = useGardenStore(state => state.addPlant);
  
  const ownedSpeciesIds = plants.map(p => p.speciesId);
  const canAddMore = plants.length < 10;
  
  const handleSelect = (speciesId: string) => {
    if (!canAddMore || ownedSpeciesIds.includes(speciesId)) return;
    
    setSelectedSpecies(speciesId);
    setIsAdding(true);
    
    setTimeout(() => {
      addPlant(speciesId);
      setIsAdding(false);
      setSelectedSpecies(null);
      onClose();
    }, 1500);
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative glass-panel p-6 max-w-4xl w-full max-h-[85vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-2xl md:text-3xl text-[#F5F3EE]">
                  Expand Your Collection
                </h2>
                <p className="text-[#F5F3EE]/50 font-ui text-sm mt-1">
                  {plants.length}/10 specimens in your garden
                </p>
              </div>
              
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5 text-[#F5F3EE]" />
              </button>
            </div>
            
            {/* Capacity warning */}
            {!canAddMore && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30"
              >
                <p className="text-[#D4AF37] font-ui text-sm">
                  Your garden has reached its maximum capacity of 10 specimens.
                </p>
              </motion.div>
            )}
            
            {/* Plant grid */}
            <div className="overflow-y-auto max-h-[60vh] pr-2 -mr-2">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {PLANT_SPECIES.map((species, index) => (
                  <motion.div
                    key={species.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <PlantCard
                      species={species}
                      isOwned={ownedSpeciesIds.includes(species.id)}
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
                  className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center"
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
                    Materializing...
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
