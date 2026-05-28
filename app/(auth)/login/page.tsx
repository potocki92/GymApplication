import { Suspense } from "react";
import type { Metadata } from "next";

import { LoginForm } from "@/features/auth/login-form";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = {
  title: `${getDictionary().auth.loginTitle} — REPIFY`,
};

export default function LoginPage() {
  return (
    <div className="mx-auto w-full max-w-sm">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
