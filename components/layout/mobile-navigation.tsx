"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, LayoutDashboard, ClipboardList, Plus, User } from "lucide-react";
import type { ComponentType } from "react";

import { useDictionary } from "@/hooks/use-dictionary";
import { cn } from "@/lib/utils";
import { isNavActive } from "./nav-items";

interface MobileItem {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}

export function MobileNavigation() {
  const pathname = usePathname();
  const t = useDictionary();

  const items: MobileItem[] = [
    { label: t.nav.dashboard, href: "/", icon: LayoutDashboard },
    { label: t.nav.plan, href: "/plan", icon: ClipboardList },
    { label: t.nav.exercises, href: "/exercises", icon: Dumbbell },
    { label: t.nav.profile, href: "/settings", icon: User },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 items-center px-2 py-1.5">
        {items.slice(0, 2).map((item) => (
          <NavTab key={item.href} item={item} active={isNavActive(pathname, item.href)} />
        ))}

        <div className="flex justify-center">
          <Link
            href="/plan/new"
            aria-label={t.nav.add}
            className="flex size-12 -translate-y-3 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 transition-transform active:scale-95"
          >
            <Plus className="size-6" />
          </Link>
        </div>

        {items.slice(2).map((item) => (
          <NavTab key={item.href} item={item} active={isNavActive(pathname, item.href)} />
        ))}
      </div>
    </nav>
  );
}

function NavTab({ item, active }: { item: MobileItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[0.65rem] font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <item.icon className="size-5" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}
