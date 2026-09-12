import { cn } from "@/lib/utils"

/**
 * The small uppercase eyebrow used above page titles, inside filter sections and
 * on metric cards. It is the ONLY place uppercase type is allowed in the system —
 * titles and body copy stay sentence case (see docs/ui-system.md).
 */
function SectionLabel({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="section-label"
      className={cn(
        "text-[0.625rem] leading-none font-semibold tracking-[0.14em] text-muted-foreground uppercase",
        className
      )}
      {...props}
    />
  )
}

export { SectionLabel }
