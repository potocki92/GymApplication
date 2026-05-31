"use client";

import Link from "next/link";
import { Bell, Search, Watch } from "lucide-react";

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
import { MobileNavDrawer } from "./mobile-nav-drawer";

export function AppHeader() {
  const t = useDictionary();
  const openCommand = useUiStore((s) => s.openCommand);

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-3 border-b px-4 py-3 sm:px-6 md:px-8"
      style={{
        background: "var(--header-bg)",
        borderColor: "var(--header-border)",
        backdropFilter: "blur(var(--header-blur))",
        WebkitBackdropFilter: "blur(var(--header-blur))",
      }}
    >
      {/* Brand — only when the sidebar is hidden (below md). */}
      <Link
        href="/"
        aria-label="REPIFY"
        className="flex items-center md:hidden"
      >
        <LogoText width={120} preload alt="" className="w-28 sm:w-32" />
      </Link>

      {/* Search-as-command (desktop ≥900px) — looks like an input, opens ⌘K. */}
      <button
        type="button"
        onClick={openCommand}
        aria-label={t.nav.searchPlaceholder}
        className="group hidden h-9 w-full max-w-[420px] items-center gap-2 rounded-xl border border-input bg-input/30 px-3 text-sm text-muted-foreground transition-colors hover:bg-input/50 hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none active:translate-y-px min-[900px]:flex"
      >
        <Search className="size-4 shrink-0" />
        <span className="truncate">{t.nav.searchPlaceholder}</span>
        <kbd className="ml-auto hidden shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[0.625rem] tracking-widest text-muted-foreground sm:inline-block">
          {t.commandPalette.kbdHint}
        </kbd>
      </button>

      {/* Compact search (below 900px) — same palette, icon-only. */}
      <Button
        variant="outline"
        size="icon-lg"
        onClick={openCommand}
        aria-label={t.nav.searchPlaceholder}
        className="active:translate-y-px min-[900px]:hidden"
      >
        <Search className="size-4" />
      </Button>

      {/* Right cluster. */}
      <div className="ml-auto flex items-center gap-2">
        <div className="md:hidden">
          <ActiveSessionTimer />
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon-lg"
              aria-label={t.nav.notifications}
              className="relative active:translate-y-px"
            >
              <Bell className="size-4" />
              {/* Accent dot punched through with a ring matching the surface. */}
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary shadow-[0_0_0_2px_var(--card)]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t.nav.notifications}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              asChild
              variant="outline"
              size="icon-lg"
              aria-label={t.nav.integrations}
              className="hidden active:translate-y-px min-[520px]:inline-flex"
            >
              <Link href="/integrations">
                <Watch className="size-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t.nav.integrations}</TooltipContent>
        </Tooltip>

        {/* Mobile nav drawer trigger — only when the sidebar is hidden. */}
        <div className="md:hidden">
          <MobileNavDrawer />
        </div>
      </div>
    </header>
  );
}
