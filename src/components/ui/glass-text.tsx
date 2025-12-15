import React from 'react';
import { cn } from '@/lib/utils';

interface GlassTextProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption';
  glow?: boolean;
}

export const GlassText = React.forwardRef<HTMLDivElement, GlassTextProps>(
  ({ className, variant = 'body', glow = false, ...props }, ref) => {
    const variantMap = {
      h1: 'font-display text-6xl md:text-7xl font-bold tracking-tight',
      h2: 'font-display text-4xl md:text-5xl font-bold tracking-tight',
      h3: 'font-display text-2xl md:text-3xl font-semibold tracking-tight',
      body: 'font-ui text-base md:text-lg font-normal',
      caption: 'font-ui text-xs md:text-sm font-medium uppercase tracking-widest',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'text-marble',
          glow && 'text-gold drop-shadow-lg drop-shadow-[#D4AF37]/50',
          variantMap[variant],
          className
        )}
        {...props}
      />
    );
  }
);

GlassText.displayName = 'GlassText';
