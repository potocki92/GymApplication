"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useDictionary } from "@/hooks/use-dictionary";
import { getSupabaseClient } from "@/lib/supabase/client";

/**
 * Signs the user out of Supabase and routes back to /login. Shared by the
 * settings account card and the mobile navigation drawer so the flow stays
 * identical in both places.
 */
export function useSignOut(): () => Promise<void> {
  const router = useRouter();
  const t = useDictionary();

  return async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    toast.success(t.auth.signedOut);
    router.push("/login");
    router.refresh();
  };
}
