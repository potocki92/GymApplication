import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Dumbbell,
  History,
  LayoutDashboard,
  Settings,
  TrendingUp,
} from "lucide-react";
import type { ComponentType } from "react";

export type NavKey =
  | "dashboard"
  | "plan"
  | "calendar"
  | "exercises"
  | "history"
  | "progress"
  | "stats"
  | "settings";

export interface NavItem {
  key: NavKey;
  href: string;
  icon: ComponentType<{ className?: string }>;
}

export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", href: "/", icon: LayoutDashboard },
  { key: "plan", href: "/plan", icon: ClipboardList },
  { key: "calendar", href: "/calendar", icon: CalendarDays },
  { key: "exercises", href: "/exercises", icon: Dumbbell },
  { key: "history", href: "/history", icon: History },
  { key: "progress", href: "/progress", icon: TrendingUp },
  { key: "stats", href: "/stats", icon: BarChart3 },
  { key: "settings", href: "/settings", icon: Settings },
];

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
