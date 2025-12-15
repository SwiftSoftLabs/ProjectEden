import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressRingProps extends React.SVGAttributes<SVGSVGElement> {
  radius?: number;
  circumference?: number;
  strokeDashoffset?: number;
  percentage?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'gold' | 'emerald' | 'twilight';
}

export const ProgressRing = React.forwardRef<SVGSVGElement, ProgressRingProps>(
  (
    {
      className,
      radius = 45,
      percentage = 0,
      size = 'md',
      color = 'gold',
      ...props
    },
    ref
  ) => {
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const sizeMap = {
      sm: 'w-16 h-16',
      md: 'w-24 h-24',
      lg: 'w-32 h-32',
    };

    const colorMap = {
      gold: '#D4AF37',
      emerald: '#004030',
      twilight: '#1A2B3C',
    };

    const svgSize = radius * 2 + 10;

    return (
      <svg
        ref={ref}
        width={svgSize}
        height={svgSize}
        className={cn(sizeMap[size], className)}
        {...props}
      >
        {/* Background circle */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="2"
        />
        {/* Progress circle */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke={colorMap[color]}
          strokeWidth="2"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.5s ease',
            transform: 'rotate(-90deg)',
            transformOrigin: `${svgSize / 2}px ${svgSize / 2}px`,
          }}
        />
      </svg>
    );
  }
);

ProgressRing.displayName = 'ProgressRing';
