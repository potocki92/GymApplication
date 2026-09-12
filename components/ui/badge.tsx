import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5.5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-ring has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/25 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        // Badges are labels, not calls to action — the default is quiet
        // graphite. Use `data` for "on track / achieved", never for decoration.
        default:
          "bg-surface-interactive text-foreground [a]:hover:bg-surface-hover",
        secondary:
          "bg-surface-raised text-muted-foreground [a]:hover:bg-surface-hover",
        data: "bg-data/12 text-data [a]:hover:bg-data/20",
        destructive:
          "bg-destructive/12 text-destructive focus-visible:ring-destructive/25 [a]:hover:bg-destructive/20",
        warning: "bg-warning/12 text-warning [a]:hover:bg-warning/20",
        outline:
          "border-border text-foreground [a]:hover:bg-surface-hover",
        ghost: "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
        link: "text-foreground underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
