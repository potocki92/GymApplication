import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="font-heading text-6xl font-bold text-primary">404</p>
      <h1 className="font-heading text-xl font-semibold">Nie znaleziono strony</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Strona, której szukasz, nie istnieje lub została przeniesiona.
      </p>
      <Button asChild className="mt-2 h-10">
        <Link href="/">Wróć do dashboardu</Link>
      </Button>
    </div>
  );
}
