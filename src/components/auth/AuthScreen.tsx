import { useState } from 'react';
import { motion } from 'framer-motion';
import { Leaf, Mail, Lock, LogIn } from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassText } from '@/components/ui/glass-text';
import { GoldenAccent } from '@/components/ui/golden-accent';

interface AuthScreenProps {
  onSignIn: (email: string) => void;
}

export function AuthScreen({ onSignIn }: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setIsSubmitting(true);
    setTimeout(() => {
      onSignIn(email);
    }, 800);
  };

  return (
    <div className="fixed inset-0 bg-[#050505] flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div 
        className="absolute inset-0" 
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(212, 175, 55, 0.08) 0%, transparent 60%)'
        }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              opacity: 0 
            }}
            animate={{ 
              y: [null, Math.random() * window.innerHeight],
              opacity: [0, 0.3, 0]
            }}
            transition={{
              duration: 10 + Math.random() * 10,
              repeat: Infinity,
              delay: Math.random() * 5
            }}
            className="absolute w-1 h-1 rounded-full bg-[#D4AF37]"
          />
        ))}
      </div>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md px-6"
      >
        {/* Logo/Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, duration: 0.8, type: 'spring' }}
          className="flex justify-center mb-8"
        >
          <div className="relative">
            <motion.div
              animate={{ 
                rotate: 360,
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                rotate: { duration: 20, repeat: Infinity, ease: 'linear' },
                scale: { duration: 2, repeat: Infinity }
              }}
              className="absolute inset-0 blur-2xl bg-[#D4AF37]/30 rounded-full"
            />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8962E] flex items-center justify-center shadow-2xl shadow-[#D4AF37]/30">
              <Leaf className="w-10 h-10 text-[#050505]" />
            </div>
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mb-12"
        >
          <GlassText variant="h1" className="mb-3">
            Project Eden
          </GlassText>
          <GlassText variant="body" className="text-marble/60">
            A luxury botanical interface
          </GlassText>
          <GoldenAccent type="line" className="w-24 mx-auto mt-6" />
        </motion.div>

        {/* Auth form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <GlassPanel variant="dark" blur="xl" className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-marble/70 font-ui text-sm mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-marble/40" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="curator@eden.garden"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-12 py-3 text-marble font-ui focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
                    required
                  />
                </div>
              </div>

              <GlassButton
                type="submit"
                variant="primary"
                size="lg"
                glow
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Leaf className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 mr-2" />
                    Enter Garden
                  </>
                )}
              </GlassButton>
            </form>

            <div className="mt-6 text-center">
              <p className="text-marble/40 font-ui text-xs">
                No password required • Demo mode
              </p>
            </div>
          </GlassPanel>
        </motion.div>

        {/* Footer text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center mt-8 text-marble/30 font-ui text-sm"
        >
          Where cultivation becomes art
        </motion.p>
      </motion.div>
    </div>
  );
}
