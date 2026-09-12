import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const toggleChipVariants = cva(
  // Selected chips become a near-white capsule — the same "active = white"
  // language as SegmentedControl and the primary button.
  "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-raised font-medium whitespace-nowrap text-muted-foreground transition-colors duration-fast outline-none hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 aria-pressed:border-transparent aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary/90 aria-pressed:hover:text-primary-foreground",
  {
    variants: {
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-9 px-3.5 text-sm",
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
