import { useState, useMemo } from "react";
import { format } from "date-fns";
import { useMealsByDate, useDailyGoals } from "@/hooks/useMeals";
import { useDrawerStore } from "@/stores/drawer-store";
import { DateNavigator } from "@/components/DateNavigator";
import { NutritionSummary } from "@/components/NutritionSummary";
import { Button } from "@/components/ui/button";
import { Plus, Target, ChevronRight } from "lucide-react";
import type { NutritionValues } from "@/types";
import { useViewTransitionNavigate } from "@/hooks/useViewTransitionNavigate";

export function LogPage() {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const meals = useMealsByDate(date);
  const goals = useDailyGoals(date);
  const { openMealDrawer, openGoalsDrawer } = useDrawerStore();
  const { navigateTo } = useViewTransitionNavigate();

  const fallbackGoals: NutritionValues & { calories: number } = {
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
      (acc, meal) => {
        return {
          calories: acc.calories + meal.nutrition.calories,
          fat: acc.fat + meal.nutrition.fat,
          carbs: acc.carbs + meal.nutrition.carbs,
          sugar: acc.sugar + meal.nutrition.sugar,
          protein: acc.protein + meal.nutrition.protein,
          salt: acc.salt + meal.nutrition.salt,
          fiber: acc.fiber + meal.nutrition.fiber,
        };
      },
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
    <>
      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-muted-foreground">
            Tagesübersicht
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => {
              openGoalsDrawer(date);
              navigateTo("/goals");
            }}>
            <Target className="h-4 w-4" />
          </Button>
        </div>
        <div className="rounded-xl border bg-card shadow-sm">
          <NutritionSummary current={totals} goals={goals ?? fallbackGoals} />
        </div>
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-sm text-muted-foreground pl-1">
          Mahlzeiten
        </h3>

        <div className="space-y-3">
          {meals?.map((meal) => (
            <div
              key={meal.id}
              className="group rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-all active:scale-[0.99]"
              onClick={() => {
                openMealDrawer("edit", meal.id);
                navigateTo("/meal");
              }}>
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

              <div className="mt-2 pt-2 border-t border-dashed text-xs text-muted-foreground line-clamp-1">
                {meal.items.map((i) => i.manualName || "Zutat").join(", ")}
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
            onClick={() => {
              openMealDrawer("create", undefined, date);
              navigateTo("/meal");
            }}>
            <Plus className="h-4 w-4" />
            Mahlzeit hinzufügen
          </Button>
        </div>
      </div>
      <DateNavigator date={date} onChange={setDate} className="shrink-0" />
    </>
  );
}
