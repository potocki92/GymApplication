import { cva, type VariantProps } from "class-variance-authority"
import { Minus, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function tapHaptic(): void {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(10)
  }
}

const displayVariants = cva("min-w-0 flex-1 text-center tabular-nums", {
  variants: {
    size: {
      sm: "text-sm font-medium",
      default: "text-base font-semibold",
      lg: "text-lg font-semibold",
    },
  },
  defaultVariants: { size: "default" },
})

const BUTTON_SIZE = { sm: "icon-sm", default: "icon", lg: "icon-lg" } as const
const BUTTON_CLASS = { sm: undefined, default: undefined, lg: "size-11" } as const
const ICON_SIZE = { sm: "size-3.5", default: "size-4", lg: "size-5" } as const

interface StepperProps extends VariantProps<typeof displayVariants> {
  display: React.ReactNode
  onDecrement: () => void
  onIncrement: () => void
  label?: string
  disabled?: boolean
  className?: string
}

function Stepper({
  display,
  onDecrement,
  onIncrement,
  label,
  disabled,
  size,
  className,
}: StepperProps) {
  const s = size ?? "default"

  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? <span className="text-xs text-muted-foreground">{label}</span> : null}
      <div className="flex items-center justify-between gap-1 rounded-lg border border-input bg-card px-1 py-1">
        <Button
          type="button"
          variant="ghost"
          size={BUTTON_SIZE[s]}
          className={BUTTON_CLASS[s]}
          disabled={disabled}
          aria-label={label ? `${label} -` : "-"}
          onClick={() => {
            tapHaptic()
            onDecrement()
          }}
        >
          <Minus className={ICON_SIZE[s]} />
        </Button>
        <span className={cn(displayVariants({ size }))}>{display}</span>
        <Button
          type="button"
          variant="ghost"
          size={BUTTON_SIZE[s]}
          className={BUTTON_CLASS[s]}
          disabled={disabled}
          aria-label={label ? `${label} +` : "+"}
          onClick={() => {
            tapHaptic()
            onIncrement()
          }}
        >
          <Plus className={ICON_SIZE[s]} />
        </Button>
      </div>
    </div>
  )
}

export { Stepper }
