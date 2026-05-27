import { Logo } from "@/components/shared/logo";
import { APP_NAME } from "@/lib/constants";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-8 flex items-center gap-2">
        <Logo size={36} className="rounded-lg" />
        <span className="font-heading text-xl font-bold tracking-tight">
          {APP_NAME}
        </span>
      </div>
      <div className="w-full">{children}</div>
    </div>
  );
}
