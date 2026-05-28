"use client";

import Link from "next/link";
import { Bell, Plus } from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useDictionary } from "@/hooks/use-dictionary";

export function DashboardHeader() {
  const t = useDictionary();
  const user = useCurrentUser();

  return (
    <header className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <Logo size={48} priority alt="" className="rounded-xl" />
        <div className="min-w-0">
          {user.ready ? (
            <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              {t.dashboard.greeting}, {user.name}! <span aria-hidden>💪</span>
            </h1>
          ) : (
            <Skeleton className="h-8 w-48" />
          )}
          <p className="mt-1 text-sm text-muted-foreground">{t.dashboard.greetingSub}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="outline"
          size="icon-lg"
          aria-label="Powiadomienia"
          className="rounded-full"
        >
          <Bell className="size-5" />
        </Button>
        <Button asChild size="lg" className="hidden h-10 sm:inline-flex">
          <Link href="/plan/new">
            <Plus className="size-4" />
            {t.dashboard.newWorkout}
          </Link>
        </Button>
      </div>
    </header>
  );
}
