import { MobileNavigation } from "./mobile-navigation";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-5 pb-28 sm:px-6 md:px-8 md:pb-10 lg:pt-8">
          {children}
        </main>
      </div>
      <MobileNavigation />
    </div>
  );
}
