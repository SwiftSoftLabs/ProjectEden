
import { cn } from "@/lib/utils"

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'light' | 'dark'
  intensity?: 'low' | 'medium' | 'high'
  blur?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
}

export function GlassPanel({
  children,
  className,
  variant = 'dark',
  intensity = 'medium',
  blur = 'xl',
  ...props
}: GlassPanelProps) {
  return (
    <div
      className={cn(
        "backdrop-blur-xl border rounded-2xl",
        variant === 'dark' ? "bg-black/40 border-white/10" : "bg-white/40 border-black/5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
