
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Sparkles, Mail, ArrowRight, Loader2 } from 'lucide-react';

export function LoginPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: window.location.origin,
            },
        });

        if (error) {
            setError(error.message);
        } else {
            setSent(true);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-[128px]" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#2D5A3D]/10 rounded-full blur-[128px]" />
            </div>

            <div className="w-full max-w-md relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-12"
                >
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B8962E] flex items-center justify-center shadow-2xl shadow-[#D4AF37]/20">
                            <Sparkles className="w-8 h-8 text-[#050505]" />
                        </div>
                    </div>
                    <h1 className="font-display text-4xl text-[#F5F3EE] mb-2 tracking-wide">Project Eden</h1>
                    <p className="font-ui text-[#F5F3EE]/50">Cultivate your digital sanctuary</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="bg-[#1A1A1A]/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl"
                >
                    {sent ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-[#2D5A3D]/20 rounded-full flex items-center justify-center mx-auto mb-6 text-[#4A7C59]">
                                <Mail className="w-8 h-8" />
                            </div>
                            <h3 className="font-display text-2xl text-[#F5F3EE] mb-4">Check your inbox</h3>
                            <p className="text-[#F5F3EE]/60 mb-8">
                                We've sent a magic link to <span className="text-[#D4AF37]">{email}</span>.
                                Click it to enter Eden.
                            </p>
                            <button
                                onClick={() => setSent(false)}
                                className="text-[#F5F3EE]/40 hover:text-[#F5F3EE] text-sm transition-colors"
                            >
                                Use a different email
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div>
                                <label className="block text-xs font-ui text-[#F5F3EE]/40 uppercase tracking-wider mb-2">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="gardener@example.com"
                                        required
                                        className="w-full bg-[#050505]/50 border border-white/10 rounded-xl px-4 py-3 pl-11 text-[#F5F3EE] placeholder-white/20 focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 transition-all"
                                    />
                                    <Mail className="absolute left-3.5 top-3.5 w-5 h-5 text-[#F5F3EE]/30" />
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#D4AF37] hover:bg-[#C9A532] text-[#050505] font-display font-medium text-lg py-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                        >
                                            <Sparkles className="w-5 h-5 text-[#050505]" />
                                        </motion.div>
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Mail className="w-5 h-5 mr-1" />
                                        Send Magic Link <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
