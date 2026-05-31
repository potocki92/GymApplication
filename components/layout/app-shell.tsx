import { AppHeader } from "./app-header";
import { CommandPalette } from "./command-palette";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-5 pb-10 sm:px-6 md:px-8 lg:pt-8">
          {children}
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
