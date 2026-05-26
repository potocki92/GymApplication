import { Suspense } from "react";
import type { Metadata } from "next";

import { LoginForm } from "@/features/auth/login-form";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = {
  title: `${getDictionary().auth.loginTitle} — FitFlow`,
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
