import {
  BarChart3,
  CalendarDays,
  Camera,
  ClipboardList,
  Dumbbell,
  Footprints,
  History,
  LayoutDashboard,
  LayoutTemplate,
  Plug,
  Settings,
  Target,
  TrendingUp,
} from "lucide-react";
import type { ComponentType } from "react";

export type NavKey =
  | "dashboard"
  | "plan"
  | "calendar"
  | "exercises"
  | "templates"
  | "history"
  | "progress"
  | "progressPhotos"
  | "stats"
  | "steps"
  | "goals"
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
  { key: "templates", href: "/templates", icon: LayoutTemplate, section: "train" },
  { key: "history", href: "/history", icon: History, section: "progress" },
  { key: "progress", href: "/progress", icon: TrendingUp, section: "progress" },
  {
    key: "progressPhotos",
    href: "/progress-photos",
    icon: Camera,
    section: "progress",
  },
  { key: "stats", href: "/stats", icon: BarChart3, section: "progress" },
  { key: "steps", href: "/steps", icon: Footprints, section: "progress" },
  { key: "goals", href: "/goals", icon: Target, section: "progress" },
  { key: "integrations", href: "/integrations", icon: Plug, section: "account" },
  { key: "settings", href: "/settings", icon: Settings, section: "account" },
];

export const NAV_SECTION_ORDER: NavSection[] = ["train", "progress", "account"];

/**
 * The four destinations pinned to the mobile bottom bar. Everything else is
 * reachable through its "Więcej" sheet — which is a sheet, not a route, so the
 * bar never needs a fifth entry in `NAV_ITEMS`.
 */
export const MOBILE_PRIMARY_NAV_KEYS = [
  "dashboard",
  "plan",
  "calendar",
  "progress",
] as const;

export type MobilePrimaryNavKey = (typeof MOBILE_PRIMARY_NAV_KEYS)[number];

/** Derived, never hand-written — order follows `MOBILE_PRIMARY_NAV_KEYS`. */
export const MOBILE_PRIMARY_NAV_ITEMS: NavItem[] = MOBILE_PRIMARY_NAV_KEYS.flatMap(
  (key) => NAV_ITEMS.filter((item) => item.key === key),
);

const isPrimaryMobileKey = (key: NavKey): boolean =>
  (MOBILE_PRIMARY_NAV_KEYS as readonly NavKey[]).includes(key);

/** Grouped view derived from the flat list, for the sidebar + mobile drawer. */
export const NAV_SECTIONS: { id: NavSection; items: NavItem[] }[] =
  NAV_SECTION_ORDER.map((id) => ({
    id,
    items: NAV_ITEMS.filter((item) => item.section === id),
  }));

/** Same grouping, minus whatever already has a slot in the mobile bottom bar. */
export const MOBILE_MORE_NAV_SECTIONS: { id: NavSection; items: NavItem[] }[] =
  NAV_SECTIONS.map(({ id, items }) => ({
    id,
    items: items.filter((item) => !isPrimaryMobileKey(item.key)),
  })).filter((section) => section.items.length > 0);

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Routes that own the whole screen. They run a long workflow and carry their own
 * bottom action bar, so the mobile nav is hidden there — both to avoid stacking
 * two bars at the bottom edge and because leaving mid-workflow should be a
 * deliberate act, not a stray tap.
 */
const FULLSCREEN_ROUTES = ["/workout/active", "/plan/new"];

export function isFullscreenRoute(pathname: string): boolean {
  return FULLSCREEN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}
