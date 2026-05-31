"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu } from "lucide-react";

import { LogoText } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useDictionary } from "@/hooks/use-dictionary";
import { useNavBadges } from "@/hooks/use-nav-badges";
import { useSignOut } from "@/hooks/use-sign-out";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";
import { isNavActive, NAV_SECTIONS } from "./nav-items";

export function MobileNavDrawer() {
  const t = useDictionary();
  const pathname = usePathname();
  const user = useCurrentUser();
  const signOut = useSignOut();
  const badges = useNavBadges();
  const authUser = useAuthStore((s) => s.user);
  const canSignOut = isSupabaseConfigured() && Boolean(authUser);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label={t.nav.menu}
          className="rounded-full"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-72 gap-0 p-0">
        <SheetHeader className="border-b border-border p-4 pr-12">
          <SheetTitle className="sr-only">REPIFY</SheetTitle>
          <SheetDescription className="sr-only">
            {t.app.tagline}
          </SheetDescription>
          <div className="flex items-center" aria-hidden="true">
            <LogoText width={148} alt="" className="w-36" />
          </div>
        </SheetHeader>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.id} className="flex flex-col gap-1">
              <p className="px-3 pt-4 pb-1 font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t.nav.sections[section.id]}
              </p>
              {section.items.map((item) => {
                const active = isNavActive(pathname, item.href);
                const badgeCount =
                  item.badge === "calendar" ? badges.calendar : 0;
                return (
                  <SheetClose asChild key={item.key}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground/70 hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <item.icon className="size-5 shrink-0" />
                      {t.nav[item.key]}
                      {badgeCount > 0 ? (
                        <span
                          className={cn(
                            "ml-auto rounded-full px-1.5 py-0.5 text-[0.625rem] font-semibold tabular-nums",
                            active
                              ? "bg-primary-foreground/20 text-primary-foreground"
                              : "bg-muted text-foreground/80",
                          )}
                        >
                          {badgeCount}
                        </span>
                      ) : null}
                    </Link>
                  </SheetClose>
                );
              })}
            </div>
          ))}
        </nav>

        {canSignOut ? (
          <div className="border-t border-border p-3">
            <p className="truncate px-3 pb-2 text-xs text-muted-foreground">
              {user.email ?? user.name}
            </p>
            <SheetClose asChild>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={signOut}
              >
                <LogOut className="size-4" />
                {t.auth.signOut}
              </Button>
            </SheetClose>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
