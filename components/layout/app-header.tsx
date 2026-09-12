"use client";

import Link from "next/link";
import { Bell, Search } from "lucide-react";

import { ActiveSessionTimer } from "@/components/shared/active-session-timer";
import { LogoText } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDictionary } from "@/hooks/use-dictionary";
import { useUiStore } from "@/store";

/**
 * Thin app bar: brand (mobile only), search-as-command, notifications and the
 * live session timer. Navigation lives in the sidebar on desktop and in
 * `MobileBottomNav` on phones — the header carries none of it.
 */
export function AppHeader() {
  const t = useDictionary();
  const openCommand = useUiStore((s) => s.openCommand);

  return (
    <header
      className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 sm:px-6 md:px-8"
      style={{
        background: "var(--header-bg)",
        borderColor: "var(--header-border)",
        backdropFilter: "blur(var(--header-blur))",
        WebkitBackdropFilter: "blur(var(--header-blur))",
      }}
    >
      {/* Brand — only when the sidebar is hidden (below md). */}
      <Link href="/" aria-label="REPIFY" className="flex items-center md:hidden">
        <LogoText width={120} preload alt="" className="w-24 sm:w-28" />
      </Link>

      {/* Search-as-command (desktop ≥900px) — looks like an input, opens ⌘K. */}
      <button
        type="button"
        onClick={openCommand}
        aria-label={t.nav.searchPlaceholder}
        className="hidden h-9 w-full max-w-[420px] items-center gap-2 rounded-lg border border-border bg-surface-raised px-3 text-sm text-muted-foreground transition-colors duration-fast hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none min-[900px]:flex"
      >
        <Search className="size-4 shrink-0" />
        <span className="truncate">{t.nav.searchPlaceholder}</span>
        <kbd className="ml-auto hidden shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[0.625rem] tracking-widest text-muted-foreground sm:inline-block">
          {t.commandPalette.kbdHint}
        </kbd>
      </button>

      {/* Right cluster. */}
      <div className="ml-auto flex items-center gap-1.5">
        <div className="md:hidden">
          <ActiveSessionTimer />
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={openCommand}
          aria-label={t.nav.searchPlaceholder}
          className="min-[900px]:hidden"
        >
          <Search className="size-4" />
        </Button>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t.nav.notifications}
              className="relative"
            >
              <Bell className="size-4" />
              {/* Unread marker — the green data accent, not a brand colour. */}
              <span className="absolute top-2 right-2 size-1.5 rounded-full bg-data" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t.nav.notifications}</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
