
import { cn } from "@/lib/utils"

interface GlassTextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption'
}

export function GlassText({
  children,
  className,
  variant = 'body',
  ...props
}: GlassTextProps) {
  return (
    <p
      className={cn(
        variant === 'h1' && "font-display text-4xl md:text-5xl text-[#F5F3EE]",
        variant === 'h2' && "font-display text-2xl md:text-3xl text-[#F5F3EE]",
        variant === 'body' && "font-ui text-base text-[#F5F3EE]/80",
        className
      )}
      {...props}
    >
      {children}
    </p>
  )
}
