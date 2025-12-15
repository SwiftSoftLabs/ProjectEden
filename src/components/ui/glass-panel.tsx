import React from 'react';
import { cn } from '@/lib/utils';

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'dark' | 'light';
  blur?: 'sm' | 'md' | 'lg' | 'xl';
}

export const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, variant = 'default', blur = 'lg', ...props }, ref) => {
    const blurMap = {
      sm: 'backdrop-blur-sm',
      md: 'backdrop-blur-md',
      lg: 'backdrop-blur-lg',
      xl: 'backdrop-blur-xl',
    };

    const variantMap = {
      default: 'bg-black/40 border-white/10',
      dark: 'bg-black/60 border-white/5',
      light: 'bg-white/10 border-white/20',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl border',
          blurMap[blur],
          variantMap[variant],
          className
        )}
        {...props}
      />
    );
  }
);

GlassPanel.displayName = 'GlassPanel';
