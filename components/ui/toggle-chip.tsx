import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const toggleChipVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border border-border bg-card font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-primary aria-pressed:hover:bg-primary/10",
  {
    variants: {
      size: {
        sm: "px-3 py-1 text-xs",
        default: "px-3 py-1.5 text-sm",
      },
    },
    defaultVariants: { size: "default" },
  }
)

function ToggleChip({
  className,
  size,
  selected,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof toggleChipVariants> & {
    selected?: boolean
  }) {
  return (
    <button
      type="button"
      data-slot="toggle-chip"
      aria-pressed={selected}
      className={cn(toggleChipVariants({ size, className }))}
      {...props}
    />
  )
}

export { ToggleChip, toggleChipVariants }
