import { formatCompact } from "@/lib/nutrition";
import { useDrawerStore } from "@/stores/drawer-store";
import type { NutritionValues } from "@/types";
import { useViewTransitionNavigate } from "@/hooks/useViewTransitionNavigate";

interface NutritionSummaryProps {
  current: NutritionValues;
  goals: NutritionValues & { calories: number }; // Goals always have a calories field
}

export function NutritionSummary({ current, goals }: NutritionSummaryProps) {
  const openGoals = useDrawerStore((state) => state.openGoalsDrawer);
  const { navigateTo } = useViewTransitionNavigate();

  return (
    <button
      onClick={() => {
        openGoals();
        navigateTo("/goals");
      }}
      className="w-full bg-background/95 backdrop-blur z-40 px-4 py-3 sticky top-0 md:static flex flex-wrap items-center justify-between text-sm transition-colors hover:bg-muted/50">
      <div className="font-bold text-base">
        {formatCompact(current.calories, goals.calories)}
        <span className="text-muted-foreground ml-0.5 font-normal">K</span>
      </div>

      <div className="flex space-x-3 text-muted-foreground tabular-nums">
        <div>
          <span className="font-medium text-foreground">
            {formatCompact(current.fat, goals.fat)}
          </span>
          <span className="ml-[1px]">F</span>
        </div>
        <div>
          <span className="font-medium text-foreground">
            {formatCompact(current.carbs, goals.carbs)}
          </span>
          <span className="ml-[1px]">KH</span>
        </div>
        <div>
          <span className="font-medium text-foreground">
            {formatCompact(current.protein, goals.protein)}
          </span>
          <span className="ml-[1px]">P</span>
        </div>
      </div>
    </button>
  );
}
