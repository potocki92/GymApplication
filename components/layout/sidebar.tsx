"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CURRENT_USER } from "@/data";
import { useDictionary } from "@/hooks/use-dictionary";
import { cn } from "@/lib/utils";
import { isNavActive, NAV_ITEMS } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();
  const t = useDictionary();

  return (
    <aside className="sticky top-0 hidden h-screen shrink-0 flex-col gap-2 bg-sidebar px-3 py-5 text-sidebar-foreground md:flex md:w-[4.75rem] lg:w-64">
      {/* Brand */}
      <Link
        href="/"
        className="mb-4 flex items-center gap-3 rounded-xl px-2.5 py-1.5 lg:px-2"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/30">
          <Activity className="size-5" />
        </span>
        <span className="hidden text-lg font-semibold tracking-tight lg:block">
          {t.app.name}
        </span>
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
            {CURRENT_USER.initials}
          </AvatarFallback>
        </Avatar>
        <span className="hidden min-w-0 flex-col lg:flex">
          <span className="truncate text-sm font-medium">{CURRENT_USER.name}</span>
          <span className="truncate text-xs text-sidebar-foreground/60">
            {t.nav.viewProfile}
          </span>
        </span>
      </Link>
    </aside>
  );
}
