import React from 'react';
import { cn } from '@/lib/utils';
import { GlassPanel } from './glass-panel';

interface NavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}

interface BottomNavigationProps extends React.HTMLAttributes<HTMLDivElement> {
  items: NavItem[];
}

export const BottomNavigation = React.forwardRef<HTMLDivElement, BottomNavigationProps>(
  ({ className, items, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('fixed bottom-0 left-0 right-0 z-40', className)}
        {...props}
      >
        <GlassPanel
          variant="dark"
          blur="xl"
          className="rounded-t-3xl rounded-b-none border-b-0 p-4 md:p-6"
        >
          <div className="flex justify-around items-center gap-2">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={item.onClick}
                className={cn(
                  'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-300',
                  'font-ui text-xs md:text-sm font-medium',
                  item.active
                    ? 'bg-[#D4AF37]/20 text-[#D4AF37]'
                    : 'text-marble/60 hover:text-marble hover:bg-white/5'
                )}
              >
                {item.icon && <div className="text-lg md:text-xl">{item.icon}</div>}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </GlassPanel>
      </div>
    );
  }
);

BottomNavigation.displayName = 'BottomNavigation';
