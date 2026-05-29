import Image from "next/image";

import { cn } from "@/lib/utils";

/** The REPIFY sygnet (lime "R" + dumbbell on black) — used wherever a compact,
 *  square brand mark fits: sidebar, headers, the mobile top bar.
 *
 *  The mark is inlined instead of rendered through an <img>/<Image> element so
 *  temporary surfaces (for example the mobile drawer) can mount/unmount without
 *  making the browser decode or re-request a logo asset on every open.
 */
export function Logo({
  size = 40,
  className,
  alt = "REPIFY",
}: {
  size?: number;
  className?: string;
  priority?: boolean;
  alt?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 2048 2048"
      width={size}
      height={size}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      className={cn("block shrink-0", className)}
    >
      <path fill="rgb(0,0,0)" d="M0 0h2048v2048H0z" />
      <path
        fill="rgb(210,245,31)"
        d="M630.316 519.423c49.48 1.058 104.457-.014 154.28.042l348.124-.007 114.25-.182c40.01-.085 81.78-1.074 121.17 6.634 54.58 10.631 105.55 34.968 148.13 70.721 154.33 130.675 129.33 393.808-52.54 485.039-46.26 23.21-86.16 32.29-137.07 36.13 9.39 13.51 23.28 30 33.72 43.04l51.69 64.97 150.53 191.63 44.18 56.86c8.56 11.02 19.14 23.62 26.46 35.12-27.97-.96-58.7-.38-86.83-.38-42.61-.17-85.22-.04-127.83.39-33.25-44.56-70.64-90-105.29-133.69l-135.04-171.71-97.5-123.79c-98.344-.04-203.797 2.31-301.782.14l.088 94.56c.03 13.57 1.811 51.33-3.067 61.7-3.423 2.13-30.249 1.8-35.348 1.34-13.49-1.25-60.622 4.17-70.13-3.24-2.279-13.54-1.285-48.22-1.282-63.87l-.109-120.75-.05-146.227c-.032-18.522-1.126-64.83 1.315-80.528 7.726-7.542 77.494-1.964 90.948-3.907 5.387-.777 11.607-.206 15.887 3.796 3.07 6.729 1.779 138.536 1.795 154.717l339.685-.477 87.71-.165c59.1-.171 112.98.556 158.47-44.48 28.88-28.592 41.24-62.517 42.3-102.623 1.93-73.067-50.03-132.275-120.63-146.145-28.01-5.537-57.48-4.219-86.15-4.198l-95.84.1-348.918.248c-27.467-37.04-57.525-72.924-85.828-109.342-6.941-8.93-35.479-43.353-39.498-51.466z"
      />
      <path
        fill="rgb(210,245,31)"
        d="M562.899 886.165c11.11-.116 73.17-1.97 78.374 1.982 4.698 11.178 2.767 80.532 2.757 96.391-.233 55.772-.128 111.552.317 167.322.046 9.15 1.217 14.27-4.885 20.41-7.64.12-76.499 1.09-77.975-1.12-4.719-7.06-3.285-36.04-3.333-46.89l-.034-71.83c.114-49.74.052-99.59-.297-149.327-.054-7.77-.297-11.694 5.076-16.938zM442.184 987.264c17.324.162 34.649.232 51.974.209 10.479-.03 34.512-1.806 42.01 4.109 3.636 9.938 1.049 29.898 1.26 40.998.262 13.73 1.603 28.35-.229 41.88-.386 2.85-2.797 4.57-5.07 5.9-16.806-.14-33.613-.12-50.419.06-10.409.13-35.026 1.97-42.804-3.1-4.74-12.65 1.174-59.05-1.87-74.45-1.057-5.347 1.054-11.623 5.148-15.606z"
      />
    </svg>
  );
}

const LOCKUP_RATIO = 728 / 760;

/** The full brand lockup (mark + REPIFY wordmark + TRAIN SMARTER tagline).
 *  Reserved for roomy, prominent placements like the auth screen. */
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
