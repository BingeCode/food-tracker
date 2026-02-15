import { formatCompact } from "@/lib/nutrition";
import type { NutritionValues } from "@/types";
import { useViewTransitionNavigate } from "@/hooks/useViewTransitionNavigate";

interface NutritionSummaryProps {
  current: NutritionValues;
  goals: NutritionValues;
}

export function NutritionSummary({
  current,
  goals,
}: NutritionSummaryProps) {
  const { navigateTo } = useViewTransitionNavigate();

  return (
    <button
      onClick={() => navigateTo("/goals")}
      className="w-full bg-background/95 backdrop-blur z-40 px-4 py-3 sticky top-0 md:static flex flex-wrap items-center justify-between text-sm transition-colors hover:bg-muted/50">
      <div className="font-bold text-base">
        {formatCompact(current.calories, goals.calories)}
        <span className="text-muted-foreground ml-0.5 font-normal">Kcal</span>
      </div>
      <div className="flex space-x-3 text-muted-foreground tabular-nums">
        <div>
          <span className="font-medium text-foreground">
            {formatCompact(current.fat, goals.fat)}
          </span>
          <span className="ml-px">F</span>
        </div>
        <div>
          <span className="font-medium text-foreground">
            {formatCompact(current.carbs, goals.carbs)}
          </span>
          <span className="ml-px">KH</span>
        </div>
        <div>
          <span className="font-medium text-foreground">
            {formatCompact(current.protein, goals.protein)}
          </span>
          <span className="ml-px">P</span>
        </div>
      </div>
    </button>
  );
}
