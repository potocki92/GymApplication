import { LogoLockup } from "@/components/shared/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-8 flex justify-center">
        <LogoLockup width={180} priority className="rounded-2xl" />
      </div>
      <div className="w-full">{children}</div>
    </div>
  );
}
