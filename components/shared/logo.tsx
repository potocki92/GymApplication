import Image from "next/image";

import { cn } from "@/lib/utils";

/** The REPIFY sygnet (lime "R" + dumbbell on black) — used wherever a compact,
 *  square brand mark fits: sidebar, headers, the mobile top bar. */
export function Logo({
  size = 40,
  className,
  priority = false,
  alt = "REPIFY",
}: {
  size?: number;
  className?: string;
  priority?: boolean;
  alt?: string;
}) {
  return (
    <Image
      src="/icon.svg"
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      unoptimized
      className={cn("shrink-0", className)}
    />
  );
}

const LOCKUP_RATIO = 728 / 760;

/** The full brand lockup (mark + REPIFY wordmark + TRAIN SMARTER tagline).
 *  Reserved for roomy, prominent placements like the auth screen and the
 *  mobile navigation drawer header. */
export function LogoLockup({
  width = 200,
  className,
  priority = false,
}: {
  width?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/logo.webp"
      alt="REPIFY — TRAIN SMARTER"
      width={width}
      height={Math.round(width * LOCKUP_RATIO)}
      priority={priority}
      unoptimized
      className={cn("h-auto", className)}
    />
  );
}

/** Typographic wordmark mirroring the lockup ("REPI" + lime "FY"), with an
 *  optional tagline. Pairs with <Logo /> in horizontal brand rows. */
export function Wordmark({
  className,
  withTagline = false,
}: {
  className?: string;
  withTagline?: boolean;
}) {
  return (
    <span className={cn("flex flex-col leading-none", className)}>
      <span className="font-heading text-lg font-bold tracking-tight">
        REPI<span className="text-primary">FY</span>
      </span>
      {withTagline ? (
        <span className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-primary/80">
          Train Smarter
        </span>
      ) : null}
    </span>
  );
}
