"use client";

import Link from "next/link";

import { LogoText } from "@/components/shared/logo";
import { MobileNavDrawer } from "./mobile-nav-drawer";

export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card/95 px-4 py-2.5 backdrop-blur md:hidden">
      <Link href="/" className="flex items-center" aria-label="REPIFY">
        <LogoText width={120} preload alt="" className="w-28 sm:w-32" />
      </Link>
      <MobileNavDrawer />
    </header>
  );
}
