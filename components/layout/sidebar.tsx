"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Logo, Wordmark } from "@/components/shared/logo";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useDictionary } from "@/hooks/use-dictionary";
import { cn } from "@/lib/utils";
import { isNavActive, NAV_ITEMS } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();
  const t = useDictionary();
  const user = useCurrentUser();

  return (
    <aside className="sticky top-0 hidden h-screen shrink-0 flex-col gap-2 bg-sidebar px-3 py-5 text-sidebar-foreground md:flex md:w-[4.75rem] lg:w-64">
      {/* Brand */}
      <Link
        href="/"
        className="mb-4 flex items-center gap-3 rounded-xl px-2.5 py-1.5 lg:px-2"
      >
        <Logo size={40} priority alt="" className="rounded-xl" />
        <Wordmark withTagline className="hidden lg:flex" />
      </Link>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(pathname, item.href);
          const label = t.nav[item.key];
          return (
            <Tooltip key={item.key}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors lg:px-3",
                    "justify-center lg:justify-start",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm shadow-sidebar-primary/30"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <item.icon className="size-5 shrink-0" />
                  <span className="hidden lg:inline">{label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="lg:hidden">
                {label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {/* User */}
      <Link
        href="/settings"
        className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-sidebar-accent"
      >
        <Avatar className="size-9 shrink-0">
          <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs font-semibold">
            {user.initials}
          </AvatarFallback>
        </Avatar>
        <span className="hidden min-w-0 flex-col lg:flex">
          <span className="truncate text-sm font-medium">{user.name}</span>
          <span className="truncate text-xs text-sidebar-foreground/60">
            {t.nav.viewProfile}
          </span>
        </span>
      </Link>
    </aside>
  );
}
