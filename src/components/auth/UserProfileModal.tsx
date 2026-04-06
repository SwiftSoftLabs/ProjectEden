import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { User, Mail, Camera, Save, LogOut, X, Lock } from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassText } from '@/components/ui/glass-text';
import { useClickOutside } from '@/hooks/useClickOutside';

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
    const { user, signOut } = useAuth();
    const [fullName, setFullName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useClickOutside(modalRef, () => {
        if (isOpen) {
            onClose();
        }
    });

    // Password reset state
    const [showPasswordReset, setShowPasswordReset] = useState(false);
    const [newPassword, setNewPassword] = useState('');

    useEffect(() => {
        if (isOpen) {
            setMessage(null);
            setShowPasswordReset(false);
            setNewPassword('');
            if (user) {
                loadProfile();
            }
        }
    }, [isOpen, user]);

    const loadProfile = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            if (data) {
                setFullName(data.full_name || '');
                setAvatarUrl(data.avatar_url || '');
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    };

    const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            setMessage(null);

            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('You must select an image to upload.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const filePath = `${user!.id}/${Math.random()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setAvatarUrl(publicUrl);
            setMessage({ type: 'success', text: 'Avatar uploaded!' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setUploading(false);
        }
    };

    const updateProfile = async () => {
        if (!user) return;
        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.from('profiles').upsert({
                id: user.id,
                full_name: fullName,
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString(),
            });

            if (error) throw error;
            setMessage({ type: 'success', text: 'Profile updated successfully' });
            setTimeout(() => onClose(), 1500);
        } catch (error) {
            setMessage({ type: 'error', text: 'Error updating profile' });
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async () => {
        if (!newPassword) return;
        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            setMessage({ type: 'success', text: 'Password updated successfully' });
            setNewPassword('');
            setShowPasswordReset(false);
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Error updating password' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        ref={modalRef}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md"
                    >
                        <GlassPanel variant="dark" intensity="high" className="p-6 overflow-hidden">
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 text-white/40 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Hidden File Input */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={uploadAvatar}
                                disabled={uploading}
                                accept="image/*"
                                className="hidden"
                            />

                            <div className="text-center mb-8">
                                {/* Avatar */}
                                <div className="relative w-24 h-24 mx-auto mb-4">
                                    <div className="w-full h-full rounded-full overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-10 h-10 text-white/20" />
                                        )}
                                    </div>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        className="absolute bottom-0 right-0 p-1.5 bg-[#D4AF37] rounded-full text-black shadow-lg hover:bg-[#B8962E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {uploading ? (
                                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                        ) : (
                                            <Camera className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>

                                <h2 className="font-display text-2xl text-[#F5F3EE]">
                                    {fullName || 'Gardener'}
                                </h2>
                                <div className="flex items-center justify-center gap-2 text-white/40 font-ui text-sm mt-1">
                                    <Mail className="w-3 h-3" />
                                    {user?.email}
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* Full Name Input */}
                                <div>
                                    <label className="block text-xs font-ui text-[#F5F3EE]/40 uppercase tracking-wider mb-2">
                                        Display Name
                                    </label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Your name"
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-[#F5F3EE] placeholder-white/10 focus:outline-none focus:border-[#D4AF37]/50 focus:bg-black/40 transition-all font-ui"
                                    />
                                </div>
                            </div>

                            {/* Password Change Toggle */}
                            {!showPasswordReset ? (
                                <button
                                    onClick={() => setShowPasswordReset(true)}
                                    className="text-[#D4AF37]/80 hover:text-[#D4AF37] text-xs font-ui flex items-center gap-1.5 mt-2 transition-colors"
                                >
                                    <Lock className="w-3 h-3" />
                                    Change Password
                                </button>
                            ) : (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    className="bg-white/5 rounded-lg p-4 border border-white/5"
                                >
                                    <label className="block text-xs font-ui text-[#F5F3EE]/40 uppercase tracking-wider mb-2">
                                        New Password
                                    </label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-[#F5F3EE] focus:outline-none focus:border-[#D4AF37]/50 mb-3"
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <button
                                            onClick={() => setShowPasswordReset(false)}
                                            className="text-xs text-white/40 hover:text-white px-2 py-1"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handlePasswordReset}
                                            disabled={!newPassword || loading}
                                            className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded transition-colors"
                                        >
                                            Update
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Feedback Message */}
                            {message && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`p-3 rounded-lg text-sm text-center ${message.type === 'success'
                                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                        }`}
                                >
                                    {message.text}
                                </motion.div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3 mt-8 pt-4 border-t border-white/10">
                                <GlassButton
                                    onClick={signOut}
                                    variant="ghost"
                                    className="flex-1 !border-red-500/20 !text-red-400 hover:!bg-red-500/10"
                                >
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Sign Out
                                </GlassButton>

                                <GlassButton
                                    onClick={updateProfile}
                                    variant="primary"
                                    className="flex-[2]"
                                    disabled={loading}
                                    glow
                                >
                                    {loading ? (
                                        <span className="animate-pulse">Saving...</span>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            Save Changes
                                        </>
                                    )}
                                </GlassButton>
                            </div>
                        </GlassPanel>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

