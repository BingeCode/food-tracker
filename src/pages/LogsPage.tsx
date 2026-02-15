import { useState, useMemo } from "react";
import { format } from "date-fns";
import { useMealsByDate, useDailyGoals } from "@/hooks/useMeals";
import { DateNavigator } from "@/components/DateNavigator";
import { NutritionSummary } from "@/components/NutritionSummary";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight } from "lucide-react";
import type { NutritionValues } from "@/types";
import { useViewTransitionNavigate } from "@/hooks/useViewTransitionNavigate";

export function LogsPage() {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const meals = useMealsByDate(date);
  const goals = useDailyGoals(date);
  const { navigateTo } = useViewTransitionNavigate();

  const fallbackGoals: NutritionValues = {
    calories: 2700,
    fat: 90,
    carbs: 304,
    protein: 169,
    sugar: 50,
    salt: 6,
    fiber: 30,
  };

  const totals = useMemo(() => {
    if (!meals)
      return {
        calories: 0,
        fat: 0,
        carbs: 0,
        sugar: 0,
        protein: 0,
        salt: 0,
        fiber: 0,
      };
    return meals.reduce(
      (acc, meal) => ({
        calories: acc.calories + meal.nutrition.calories,
        fat: acc.fat + meal.nutrition.fat,
        carbs: acc.carbs + meal.nutrition.carbs,
        sugar: acc.sugar + meal.nutrition.sugar,
        protein: acc.protein + meal.nutrition.protein,
        salt: acc.salt + meal.nutrition.salt,
        fiber: acc.fiber + meal.nutrition.fiber,
      }),
      {
        calories: 0,
        fat: 0,
        carbs: 0,
        sugar: 0,
        protein: 0,
        salt: 0,
        fiber: 0,
      },
    );
  }, [meals]);

  return (
    <div className="h-full flex flex-col min-h-0 gap-3">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-muted-foreground">
            Tagesübersicht
          </h3>
        </div>
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <NutritionSummary
            current={totals}
            goals={goals ?? fallbackGoals}
            date={date}
          />
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        <h3 className="font-semibold text-sm text-muted-foreground pl-1">
          Mahlzeiten
        </h3>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
          {meals?.map((meal) => (
            <div
              key={meal.id}
              className="group rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-all active:scale-[0.99]"
              onClick={() => navigateTo(`/meal?id=${meal.id}`)}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground/80">
                    {meal.time}
                  </span>
                  <span className="text-sm font-medium">{meal.name}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              </div>

              <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                <div>
                  <span className="font-semibold text-foreground">
                    {Math.round(meal.nutrition.calories)}
                  </span>{" "}
                  kcal
                </div>
                <div>
                  <span className="font-semibold text-foreground">
                    {Math.round(meal.nutrition.protein)}g
                  </span>{" "}
                  P
                </div>
                <div>
                  <span className="font-semibold text-foreground">
                    {Math.round(meal.nutrition.carbs)}g
                  </span>{" "}
                  KH
                </div>
                <div>
                  <span className="font-semibold text-foreground">
                    {Math.round(meal.nutrition.fat)}g
                  </span>{" "}
                  Fett
                </div>
              </div>
            </div>
          ))}

          {(!meals || meals.length === 0) && (
            <div className="text-center py-10 text-muted-foreground text-sm border-2 border-dashed rounded-xl">
              Noch keine Mahlzeiten für heute.
            </div>
          )}

          <Button
            variant="outline"
            className="w-full h-auto py-3 justify-start"
            onClick={() => navigateTo(`/meal?date=${date}`)}>
            <Plus className="h-4 w-4" />
            Mahlzeit hinzufügen
          </Button>
        </div>
      </div>
      <DateNavigator date={date} onChange={setDate} className="shrink-0" />
    </div>
  );
}
