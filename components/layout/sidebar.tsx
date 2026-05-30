"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Timer } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogoText } from "@/components/shared/logo";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useActiveSessionTimer } from "@/hooks/use-active-session-timer";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useDictionary } from "@/hooks/use-dictionary";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/utils";
import { isNavActive, NAV_ITEMS } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();
  const t = useDictionary();
  const user = useCurrentUser();
  const timer = useActiveSessionTimer();

  return (
    <aside className="group/sidebar sticky top-0 hidden h-screen shrink-0 flex-col gap-2 overflow-hidden border-r border-sidebar-border bg-sidebar px-3 py-5 text-sidebar-foreground shadow-2xl shadow-black/25 md:flex md:w-[4.75rem] md:hover:w-64 md:focus-within:w-64 motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-out">
      {/* Brand */}
      <Link
        href="/"
        className="mb-4 flex w-10 items-center justify-start overflow-hidden rounded-xl px-0 py-1.5 md:group-hover/sidebar:w-36 md:group-focus-within/sidebar:w-36 motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-out"
        aria-label="REPIFY"
      >
        <LogoText
          width={148}
          preload
          alt=""
          className="w-36 max-w-none"
        />
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
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    "justify-center md:group-hover/sidebar:justify-start md:group-focus-within/sidebar:justify-start",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm shadow-sidebar-primary/30"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <item.icon className="size-5 shrink-0" />
                  <span className="max-w-0 -translate-x-1 overflow-hidden whitespace-nowrap opacity-0 motion-safe:transition-[max-width,opacity,transform] motion-safe:duration-200 motion-safe:ease-out md:group-hover/sidebar:max-w-40 md:group-hover/sidebar:translate-x-0 md:group-hover/sidebar:opacity-100 md:group-focus-within/sidebar:max-w-40 md:group-focus-within/sidebar:translate-x-0 md:group-focus-within/sidebar:opacity-100">
                    {label}
                  </span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="lg:hidden">
                {label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {/* Active workout timer */}
      {timer.isActive ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/workout/active"
              aria-label={t.activeWorkout.returnToWorkout}
              className="group flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 justify-center md:group-hover/sidebar:justify-start md:group-focus-within/sidebar:justify-start"
            >
              <span className="relative flex size-5 shrink-0 items-center justify-center">
                <Timer className="size-5" />
                {!timer.isPaused ? (
                  <span className="absolute -right-0.5 -top-0.5 inline-flex size-2 animate-ping rounded-full bg-primary" />
                ) : null}
              </span>
              <span className="max-w-0 -translate-x-1 overflow-hidden whitespace-nowrap font-mono tabular-nums opacity-0 motion-safe:transition-[max-width,opacity,transform] motion-safe:duration-200 motion-safe:ease-out md:group-hover/sidebar:max-w-40 md:group-hover/sidebar:translate-x-0 md:group-hover/sidebar:opacity-100 md:group-focus-within/sidebar:max-w-40 md:group-focus-within/sidebar:translate-x-0 md:group-focus-within/sidebar:opacity-100">
                {formatClock(timer.totalMs)}
              </span>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="lg:hidden">
            {t.activeWorkout.inProgress} · {formatClock(timer.totalMs)}
          </TooltipContent>
        </Tooltip>
      ) : null}

      {/* User */}
      <Link
        href="/settings"
        className="flex items-center justify-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-sidebar-accent md:group-hover/sidebar:justify-start md:group-focus-within/sidebar:justify-start"
      >
        <Avatar className="size-9 shrink-0">
          <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs font-semibold">
            {user.initials}
          </AvatarFallback>
        </Avatar>
        <span className="flex min-w-0 max-w-0 -translate-x-1 flex-col overflow-hidden opacity-0 motion-safe:transition-[max-width,opacity,transform] motion-safe:duration-200 motion-safe:ease-out md:group-hover/sidebar:max-w-44 md:group-hover/sidebar:translate-x-0 md:group-hover/sidebar:opacity-100 md:group-focus-within/sidebar:max-w-44 md:group-focus-within/sidebar:translate-x-0 md:group-focus-within/sidebar:opacity-100">
          <span className="truncate text-sm font-medium">{user.name}</span>
          <span className="truncate text-xs text-sidebar-foreground/60">
            {t.nav.viewProfile}
          </span>
        </span>
      </Link>
    </aside>
  );
}
