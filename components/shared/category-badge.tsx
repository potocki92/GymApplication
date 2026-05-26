import { useDictionary } from "@/hooks/use-dictionary";
import { cn } from "@/lib/utils";
import type { ExerciseCategory } from "@/types";

export function CategoryBadge({
  category,
  className,
}: {
  category: ExerciseCategory;
  className?: string;
}) {
  const t = useDictionary();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      {t.categories[category]}
    </span>
  );
}
