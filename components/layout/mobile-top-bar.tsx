"use client";

import Link from "next/link";

import { Logo, Wordmark } from "@/components/shared/logo";
import { MobileNavDrawer } from "./mobile-nav-drawer";

export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card/95 px-4 py-2.5 backdrop-blur md:hidden">
      <Link href="/" className="flex items-center gap-2.5" aria-label="REPIFY">
        <Logo size={32} priority alt="" className="rounded-lg" />
        <Wordmark />
      </Link>
      <MobileNavDrawer />
    </header>
  );
}
