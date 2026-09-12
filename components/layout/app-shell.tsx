import { AppHeader } from "./app-header";
import { CommandPalette } from "./command-palette";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        {/* Bottom padding clears the mobile nav bar (h-14) plus the iOS home
            indicator; from `md` the sidebar takes over and it is not needed. */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-5 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:px-6 md:px-8 md:pb-10 lg:pt-8">
          {children}
        </main>
      </div>
      <MobileBottomNav />
      <CommandPalette />
    </div>
  );
}
