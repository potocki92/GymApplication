"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu } from "lucide-react";

import { LogoLockup } from "@/components/shared/logo";
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
import { useSignOut } from "@/hooks/use-sign-out";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";
import { isNavActive, NAV_ITEMS } from "./nav-items";

export function MobileNavDrawer() {
  const t = useDictionary();
  const pathname = usePathname();
  const user = useCurrentUser();
  const signOut = useSignOut();
  const authUser = useAuthStore((s) => s.user);
  const canSignOut = isSupabaseConfigured() && Boolean(authUser);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-lg" aria-label={t.nav.menu} className="rounded-full">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-72 gap-0 p-0">
        <SheetHeader className="border-b border-border p-4">
          <SheetTitle className="sr-only">REPIFY</SheetTitle>
          <SheetDescription className="sr-only">{t.app.tagline}</SheetDescription>
          <LogoLockup width={132} />
        </SheetHeader>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => {
            const active = isNavActive(pathname, item.href);
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
                </Link>
              </SheetClose>
            );
          })}
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
