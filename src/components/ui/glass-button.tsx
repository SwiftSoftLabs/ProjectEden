
import { cn } from "@/lib/utils"
import { motion, HTMLMotionProps } from "framer-motion"

interface GlassButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  glow?: boolean
}

export function GlassButton({
  children,
  className,
  variant = 'primary',
  size = 'md',
  glow = false,
  ...props
}: GlassButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative rounded-xl font-display font-medium transition-all flex items-center justify-center",
        variant === 'primary' && "bg-[#D4AF37] text-black hover:bg-[#C9A532]",
        variant === 'secondary' && "bg-white/10 text-white border border-white/10 hover:bg-white/20",
        variant === 'ghost' && "bg-transparent text-white/60 hover:text-white hover:bg-white/5",
        size === 'sm' && "px-3 py-1.5 text-xs",
        size === 'md' && "px-4 py-2 text-sm",
        size === 'lg' && "px-6 py-3 text-base",
        glow && "shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)]",
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  )
}
