"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, Timer } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Logo, Wordmark } from "@/components/shared/logo";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useActiveSessionTimer } from "@/hooks/use-active-session-timer";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useDictionary } from "@/hooks/use-dictionary";
import { useNavBadges } from "@/hooks/use-nav-badges";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store";
import { isNavActive, NAV_SECTIONS } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();
  const t = useDictionary();
  const user = useCurrentUser();
  const timer = useActiveSessionTimer();
  const badges = useNavBadges();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);

  // Apply the persisted collapse preference after mount (store uses
  // skipHydration), so first paint matches the server (expanded).
  useEffect(() => {
    void useUiStore.persist.rehydrate();
  }, []);

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "sticky top-0 z-40 hidden h-screen shrink-0 flex-col gap-2 overflow-hidden border-r border-sidebar-border bg-sidebar px-3 py-5 text-sidebar-foreground shadow-xl shadow-black/20 md:flex",
        "motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-[var(--ease-out-quint)]",
        collapsed ? "md:w-[4.5rem]" : "md:w-64",
      )}
    >
      {/* Brand — fixed square mark + wordmark that hides when collapsed. */}
      <Link
        href="/"
        aria-label="REPIFY"
        className={cn(
          "mb-3 flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-sidebar-accent/50",
          collapsed ? "justify-center" : "justify-start",
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-inset ring-sidebar-border">
          <Logo size={36} alt="" className="size-full" />
        </span>
        {!collapsed ? (
          <Wordmark withTagline className="overflow-hidden whitespace-nowrap" />
        ) : null}
      </Link>

      {/* Navigation — grouped into sections. */}
      <nav aria-label={t.app.name} className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.id} className="flex flex-col gap-1">
            {collapsed ? (
              <div className="mx-2 my-2 h-px bg-sidebar-border/60" aria-hidden />
            ) : (
              <p className="px-3 pt-4 pb-1 font-display text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/45">
                {t.nav.sections[section.id]}
              </p>
            )}

            {section.items.map((item) => {
              const active = isNavActive(pathname, item.href);
              const label = t.nav[item.key];
              const badgeCount =
                item.badge === "calendar" ? badges.calendar : 0;

              const link = (
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    collapsed ? "justify-center" : "justify-start",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )}
                >
                  {/* Left accent bar on the active row. */}
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-sidebar-primary"
                    />
                  ) : null}
                  <item.icon
                    className={cn(
                      "size-5 shrink-0",
                      active ? "text-sidebar-primary" : "",
                    )}
                  />
                  {!collapsed ? (
                    <span className="overflow-hidden whitespace-nowrap">
                      {label}
                    </span>
                  ) : null}
                  {!collapsed && badgeCount > 0 ? (
                    <span
                      className={cn(
                        "ml-auto rounded-full px-1.5 py-0.5 text-[0.625rem] font-semibold tabular-nums",
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "bg-sidebar-accent text-sidebar-foreground/80",
                      )}
                    >
                      {badgeCount}
                    </span>
                  ) : null}
                  {/* Collapsed badge → corner dot. */}
                  {collapsed && badgeCount > 0 ? (
                    <span
                      aria-hidden
                      className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-sidebar-primary"
                    />
                  ) : null}
                </Link>
              );

              return collapsed ? (
                <Tooltip key={item.key}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">
                    {label}
                    {badgeCount > 0 ? ` · ${badgeCount}` : ""}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div key={item.key}>{link}</div>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="flex flex-col gap-1 border-t border-sidebar-border/60 pt-3">
        {/* Active workout timer. */}
        {timer.isActive ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/workout/active"
                aria-label={t.activeWorkout.returnToWorkout}
                className={cn(
                  "group flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20",
                  collapsed ? "justify-center" : "justify-start",
                )}
              >
                <span className="relative flex size-5 shrink-0 items-center justify-center">
                  <Timer className="size-5" />
                  {!timer.isPaused ? (
                    <span className="absolute -right-0.5 -top-0.5 inline-flex size-2 animate-ping rounded-full bg-primary" />
                  ) : null}
                </span>
                {!collapsed ? (
                  <span className="overflow-hidden whitespace-nowrap font-mono tabular-nums">
                    {formatClock(timer.totalMs)}
                  </span>
                ) : null}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className={collapsed ? "" : "lg:hidden"}>
              {t.activeWorkout.inProgress} · {formatClock(timer.totalMs)}
            </TooltipContent>
          </Tooltip>
        ) : null}

        {/* Collapse toggle. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggle}
              aria-label={collapsed ? t.nav.expand : t.nav.collapse}
              aria-expanded={!collapsed}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed ? "justify-center" : "justify-start",
              )}
            >
              {collapsed ? (
                <PanelLeftOpen className="size-5 shrink-0" />
              ) : (
                <PanelLeftClose className="size-5 shrink-0" />
              )}
              {!collapsed ? (
                <span className="overflow-hidden whitespace-nowrap">
                  {t.nav.collapse}
                </span>
              ) : null}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className={collapsed ? "" : "hidden"}>
            {t.nav.expand}
          </TooltipContent>
        </Tooltip>

        {/* User. */}
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-sidebar-accent",
            collapsed ? "justify-center" : "justify-start",
          )}
        >
          <Avatar className="size-9 shrink-0">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs font-semibold">
              {user.initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed ? (
            <span className="flex min-w-0 flex-col overflow-hidden">
              <span className="truncate text-sm font-medium">{user.name}</span>
              <span className="truncate text-xs text-sidebar-foreground/60">
                {t.nav.viewProfile}
              </span>
            </span>
          ) : null}
        </Link>
      </div>
    </aside>
  );
}
