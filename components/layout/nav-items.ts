import {
  BarChart3,
  CalendarDays,
  Camera,
  ClipboardList,
  Dumbbell,
  History,
  LayoutDashboard,
  Plug,
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
  | "progressPhotos"
  | "stats"
  | "integrations"
  | "settings";

export type NavSection = "train" | "progress" | "account";

/** Keys for dynamic badges resolved at render time (never baked into config). */
export type NavBadge = "calendar";

export interface NavItem {
  key: NavKey;
  href: string;
  icon: ComponentType<{ className?: string }>;
  section: NavSection;
  badge?: NavBadge;
}

/**
 * Flat list — kept intact so existing consumers (`.map`) keep working.
 * `section` and `badge` are additive fields.
 */
export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", href: "/", icon: LayoutDashboard, section: "train" },
  { key: "plan", href: "/plan", icon: ClipboardList, section: "train" },
  {
    key: "calendar",
    href: "/calendar",
    icon: CalendarDays,
    section: "train",
    badge: "calendar",
  },
  { key: "exercises", href: "/exercises", icon: Dumbbell, section: "train" },
  { key: "history", href: "/history", icon: History, section: "progress" },
  { key: "progress", href: "/progress", icon: TrendingUp, section: "progress" },
  {
    key: "progressPhotos",
    href: "/progress-photos",
    icon: Camera,
    section: "progress",
  },
  { key: "stats", href: "/stats", icon: BarChart3, section: "progress" },
  { key: "integrations", href: "/integrations", icon: Plug, section: "account" },
  { key: "settings", href: "/settings", icon: Settings, section: "account" },
];

export const NAV_SECTION_ORDER: NavSection[] = ["train", "progress", "account"];

/** Grouped view derived from the flat list, for the sidebar + mobile drawer. */
export const NAV_SECTIONS: { id: NavSection; items: NavItem[] }[] =
  NAV_SECTION_ORDER.map((id) => ({
    id,
    items: NAV_ITEMS.filter((item) => item.section === id),
  }));

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
