"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

export function LoginForm() {
  const t = useDictionary();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  if (!isSupabaseConfigured()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.auth.loginTitle}</CardTitle>
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
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setPending(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setPending(false);
    if (error) {
      const msg = error.message.toLowerCase().includes("invalid")
        ? t.auth.invalidCredentials
        : error.message;
      toast.error(msg);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.auth.loginTitle}</CardTitle>
        <CardDescription>{t.auth.loginSub}</CardDescription>
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.auth.passwordPlaceholder}
            />
          </div>
          <Button type="submit" className="h-10 w-full" disabled={pending}>
            {t.auth.loginButton}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t.auth.noAccount}{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            {t.auth.signupLink}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
