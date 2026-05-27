"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDictionary } from "@/hooks/use-dictionary";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

function SignupBody() {
  const t = useDictionary();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  if (!isSupabaseConfigured()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.auth.signupTitle}</CardTitle>
          <CardDescription>
            Supabase is not configured — set NEXT_PUBLIC_SUPABASE_URL and
            NEXT_PUBLIC_SUPABASE_ANON_KEY in <code>.env.local</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/">{t.common.back}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error(t.auth.weakPassword);
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setPending(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback`
            : undefined,
      },
    });
    setPending(false);

    if (error) {
      toast.error(error.message || t.auth.generic);
      return;
    }
    // When the project requires email confirmation, signUp returns a user but
    // no session — show the "check your inbox" state instead of redirecting.
    if (data.session) {
      toast.success(t.auth.signupSuccess);
      router.push("/");
      router.refresh();
    } else {
      setConfirmationSent(true);
    }
  };

  if (confirmationSent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.auth.signupSuccess}</CardTitle>
          <CardDescription>{t.auth.confirmEmail}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/login">{t.auth.loginLink}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.auth.signupTitle}</CardTitle>
        <CardDescription>{t.auth.signupSub}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">{t.auth.emailLabel}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.auth.emailPlaceholder}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">{t.auth.passwordLabel}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.auth.passwordPlaceholder}
            />
          </div>
          <Button type="submit" className="h-10 w-full" disabled={pending}>
            {t.auth.signupButton}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t.auth.haveAccount}{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            {t.auth.loginLink}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function SignupPage() {
  return (
    <div className="mx-auto w-full max-w-sm">
      <SignupBody />
    </div>
  );
}
