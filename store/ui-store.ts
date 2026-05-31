import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiState {
  /** Desktop sidebar collapsed to the icon rail. Persisted. */
  sidebarCollapsed: boolean;
  /** Command palette (⌘K) open. Never persisted. */
  commandOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (value: boolean) => void;
  openCommand: () => void;
  closeCommand: () => void;
  setCommandOpen: (value: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      commandOpen: false,
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
      openCommand: () => set({ commandOpen: true }),
      closeCommand: () => set({ commandOpen: false }),
      setCommandOpen: (value) => set({ commandOpen: value }),
    }),
    {
      name: "repify-ui",
      // Persist only the durable preference. `commandOpen` must never rehydrate.
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }),
      // Render the default (expanded) on first paint, then apply the stored
      // value via `rehydrate()` after mount — avoids SSR/client mismatch.
      skipHydration: true,
    },
  ),
);

export const selectSidebarCollapsed = (s: UiState) => s.sidebarCollapsed;
export const selectCommandOpen = (s: UiState) => s.commandOpen;
