import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  // Graphite field, hairline edge, quiet focus ring — see docs/ui-system.md.
  // `text-base` below `md` is deliberate: iOS Safari zooms on focus under 16px.
  "w-full min-w-0 rounded-lg border border-border bg-surface-raised px-3 py-1 text-base text-foreground transition-colors duration-fast outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-foreground/25 focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/25 md:text-sm",
  {
    variants: {
      size: {
        sm: "h-9",
        default: "h-10",
        lg: "h-11",
      },
    },
    defaultVariants: { size: "default" },
  }
)

const nativeDateInputClassName =
  "block max-w-full appearance-none [&::-webkit-date-and-time-value]:min-h-[1.5em] [&::-webkit-date-and-time-value]:text-left [&::-webkit-datetime-edit]:inline-flex [&::-webkit-datetime-edit]:items-center [&::-webkit-datetime-edit-fields-wrapper]:p-0"

const nativeDateInputTypes = new Set(["date", "datetime-local", "month", "time", "week"])

function Input({
  className,
  type,
  size,
  ...props
}: Omit<React.ComponentProps<"input">, "size"> & VariantProps<typeof inputVariants>) {
  const isNativeDateInput = typeof type === "string" && nativeDateInputTypes.has(type)

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        inputVariants({ size }),
        isNativeDateInput && nativeDateInputClassName,
        className
      )}
      {...props}
    />
  )
}

export { Input, inputVariants }
