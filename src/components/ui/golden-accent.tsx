import React from 'react';
import { cn } from '@/lib/utils';

interface GoldenAccentProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: 'line' | 'dot' | 'glow' | 'border';
  orientation?: 'horizontal' | 'vertical';
}

export const GoldenAccent = React.forwardRef<HTMLDivElement, GoldenAccentProps>(
  ({ className, type = 'line', orientation = 'horizontal', ...props }, ref) => {
    const typeMap = {
      line: cn(
        'bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent',
        orientation === 'vertical' && 'bg-gradient-to-b w-0.5',
        orientation === 'horizontal' && 'h-0.5'
      ),
      dot: 'w-2 h-2 rounded-full bg-[#D4AF37]',
      glow: 'bg-[#D4AF37]/20 blur-xl rounded-full',
      border: 'border-l-2 border-[#D4AF37]',
    };

    return (
      <div
        ref={ref}
        className={cn(typeMap[type], className)}
        {...props}
      />
    );
  }
);

GoldenAccent.displayName = 'GoldenAccent';
