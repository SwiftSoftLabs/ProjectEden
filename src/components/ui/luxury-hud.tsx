import React from 'react';
import { cn } from '@/lib/utils';
import { GlassPanel } from './glass-panel';
import { GlassText } from './glass-text';

interface LuxuryHUDProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  position?: 'top' | 'bottom' | 'center';
}

export const LuxuryHUD = React.forwardRef<HTMLDivElement, LuxuryHUDProps>(
  ({ className, title, subtitle, children, position = 'bottom', ...props }, ref) => {
    const positionMap = {
      top: 'top-8',
      bottom: 'bottom-8',
      center: 'top-1/2 -translate-y-1/2',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'fixed left-1/2 -translate-x-1/2 z-50',
          positionMap[position],
          className
        )}
        {...props}
      >
        <GlassPanel variant="dark" blur="xl" className="p-6 md:p-8 max-w-md md:max-w-lg">
          {title && (
            <GlassText variant="h3" className="mb-2">
              {title}
            </GlassText>
          )}
          {subtitle && (
            <GlassText variant="body" className="text-marble/70 mb-4">
              {subtitle}
            </GlassText>
          )}
          {children}
        </GlassPanel>
      </div>
    );
  }
);

LuxuryHUD.displayName = 'LuxuryHUD';
