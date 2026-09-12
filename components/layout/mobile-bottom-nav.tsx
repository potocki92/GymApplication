"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, MoreHorizontal } from "lucide-react";

import { AppSheet, AppSheetBody } from "@/components/ui/app-sheet";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useDictionary } from "@/hooks/use-dictionary";
import { useNavBadges } from "@/hooks/use-nav-badges";
import { useSignOut } from "@/hooks/use-sign-out";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";
import {
  isNavActive,
  MOBILE_MORE_NAV_SECTIONS,
  MOBILE_PRIMARY_NAV_ITEMS,
  type MobilePrimaryNavKey,
} from "./nav-items";

/**
 * Mobile primary navigation. Four pinned destinations plus a "Więcej" tab that
 * opens an `AppSheet` with every remaining `NAV_ITEM`, grouped by its existing
 * `NavSection` — the nav config stays the single source of truth.
 *
 * Hidden from `md` up, where the sidebar takes over.
 */
export function MobileBottomNav() {
  const t = useDictionary();
  const pathname = usePathname();
  const badges = useNavBadges();
  const [moreOpen, setMoreOpen] = useState(false);

  const user = useCurrentUser();
  const signOut = useSignOut();
  const authUser = useAuthStore((s) => s.user);
  const canSignOut = isSupabaseConfigured() && Boolean(authUser);

  // "Więcej" is active whenever the current route is not one of the pinned four.
  const moreActive =
    !moreOpen &&
    !MOBILE_PRIMARY_NAV_ITEMS.some((item) => isNavActive(pathname, item.href));

  return (
    <>
      <nav
        aria-label={t.app.name}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] supports-backdrop-filter:bg-background/80 supports-backdrop-filter:backdrop-blur-xl md:hidden"
      >
        <ul className="flex items-stretch">
          {MOBILE_PRIMARY_NAV_ITEMS.map((item) => {
            const active = isNavActive(pathname, item.href);
            const badgeCount = item.badge === "calendar" ? badges.calendar : 0;

            return (
              <li key={item.key} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-14 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors duration-fast",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="relative">
                    <item.icon className="size-5" />
                    {badgeCount > 0 ? (
                      <span
                        aria-hidden
                        className="absolute -top-0.5 -right-1 size-1.5 rounded-full bg-data"
                      />
                    ) : null}
                  </span>
                  <span className="max-w-full truncate px-1">
                    {t.nav.short[item.key as MobilePrimaryNavKey]}
                  </span>
                </Link>
              </li>
            );
          })}

          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className={cn(
                "flex h-14 w-full flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors duration-fast",
                moreActive || moreOpen
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <MoreHorizontal className="size-5" />
              <span>{t.nav.more}</span>
            </button>
          </li>
        </ul>
      </nav>

      <AppSheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        title={t.nav.moreTitle}
      >
        <AppSheetBody className="flex flex-col gap-5 pb-6">
          {MOBILE_MORE_NAV_SECTIONS.map((section) => (
            <section key={section.id} className="flex flex-col gap-2">
              <SectionLabel>{t.nav.sections[section.id]}</SectionLabel>
              <ul className="grid grid-cols-2 gap-2">
                {section.items.map((item) => {
                  const active = isNavActive(pathname, item.href);
                  const badgeCount =
                    item.badge === "calendar" ? badges.calendar : 0;

                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        onClick={() => setMoreOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex h-full items-center gap-2.5 rounded-xl border border-border p-3 text-sm font-medium transition-colors duration-fast",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-card text-foreground hover:bg-surface-hover",
                        )}
                      >
                        <item.icon className="size-4 shrink-0" />
                        <span className="min-w-0 truncate">{t.nav[item.key]}</span>
                        {badgeCount > 0 ? (
                          <span
                            className={cn(
                              "ml-auto shrink-0 rounded-full px-1.5 py-0.5 font-numeric text-[0.625rem] font-semibold tabular-nums",
                              active
                                ? "bg-primary-foreground/20"
                                : "bg-surface-interactive text-muted-foreground",
                            )}
                          >
                            {badgeCount}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {canSignOut ? (
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <p className="truncate text-xs text-muted-foreground">
                {user.email ?? user.name}
              </p>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setMoreOpen(false);
                  signOut();
                }}
              >
                <LogOut className="size-4" />
                {t.auth.signOut}
              </Button>
            </div>
          ) : null}
        </AppSheetBody>
      </AppSheet>
    </>
  );
}
