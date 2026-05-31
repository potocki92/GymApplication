"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Play, Scale, Watch } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useDictionary } from "@/hooks/use-dictionary";
import { useUiStore } from "@/store";
import { NAV_ITEMS } from "./nav-items";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function CommandPalette() {
  const t = useDictionary();
  const router = useRouter();
  const open = useUiStore((s) => s.commandOpen);
  const setOpen = useUiStore((s) => s.setCommandOpen);
  const toggle = () =>
    useUiStore.setState((s) => ({ commandOpen: !s.commandOpen }));

  // Global ⌘K / Ctrl+K listener.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        // Don't hijack ⌘K while typing elsewhere unless the palette is open.
        if (!useUiStore.getState().commandOpen && isTypingTarget(e.target)) {
          return;
        }
        e.preventDefault();
        toggle();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  const quickActions: { key: string; label: string; icon: typeof Play; href: string }[] = [
    { key: "start", label: t.commandPalette.startWorkout, icon: Play, href: "/workout/active" },
    { key: "weight", label: t.commandPalette.logWeight, icon: Scale, href: "/progress" },
    { key: "garmin", label: t.commandPalette.connectGarmin, icon: Watch, href: "/integrations" },
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={t.commandPalette.placeholder} />
      <CommandList>
        <CommandEmpty>{t.commandPalette.empty}</CommandEmpty>

        <CommandGroup heading={t.commandPalette.groupNav}>
          {NAV_ITEMS.map((item) => (
            <CommandItem
              key={item.key}
              value={`${t.nav[item.key]} ${item.href}`}
              onSelect={() => go(item.href)}
            >
              <item.icon className="size-4" />
              {t.nav[item.key]}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t.commandPalette.groupActions}>
          {quickActions.map((action) => (
            <CommandItem
              key={action.key}
              value={action.label}
              onSelect={() => go(action.href)}
            >
              <action.icon className="size-4" />
              {action.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
