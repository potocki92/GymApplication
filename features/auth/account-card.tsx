"use client";

import { useRouter } from "next/navigation";
import { LogOut, UserCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDictionary } from "@/hooks/use-dictionary";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuthStore } from "@/store";

/**
 * Account widget for the settings page. Hidden when Supabase isn't configured —
 * in fully-local mode there's nothing to sign out of.
 */
export function AccountCard() {
  const t = useDictionary();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);

  if (!isSupabaseConfigured()) return null;

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    toast.success(t.auth.signedOut);
    router.push("/login");
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCircle className="size-5" />
          {t.auth.account}
        </CardTitle>
        {initialized && user ? (
          <CardDescription>{user.email}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        <Button variant="outline" onClick={handleSignOut} disabled={!user}>
          <LogOut className="size-4" />
          {t.auth.signOut}
        </Button>
      </CardContent>
    </Card>
  );
}
