import React from 'react';
import { cn } from '@/lib/utils';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
}

export const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, variant = 'primary', size = 'md', glow = false, ...props }, ref) => {
    const variantMap = {
      primary: 'bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 border-[#D4AF37]/40 text-[#D4AF37]',
      secondary: 'bg-white/10 hover:bg-white/20 border-white/20 text-white',
      ghost: 'bg-transparent hover:bg-white/5 border-white/10 text-white',
    };

    const sizeMap = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'rounded-lg border backdrop-blur-md transition-all duration-300',
          'font-ui font-medium',
          'active:scale-95',
          glow && 'shadow-lg shadow-[#D4AF37]/20',
          variantMap[variant],
          sizeMap[size],
          className
        )}
        {...props}
      />
    );
  }
);

GlassButton.displayName = 'GlassButton';
