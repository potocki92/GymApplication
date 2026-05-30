"use client";

import Link from "next/link";

import { ActiveSessionTimer } from "@/components/shared/active-session-timer";
import { LogoText } from "@/components/shared/logo";
import { MobileNavDrawer } from "./mobile-nav-drawer";

export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-border bg-card/95 px-4 py-2.5 backdrop-blur md:hidden">
      <Link href="/" className="flex items-center" aria-label="REPIFY">
        <LogoText width={120} preload alt="" className="w-28 sm:w-32" />
      </Link>
      <div className="flex items-center gap-1">
        <ActiveSessionTimer />
        <MobileNavDrawer />
      </div>
    </header>
  );
}
