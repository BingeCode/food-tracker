import { useState, useMemo } from "react";
import { format } from "date-fns";
import { useMealsByDate, useDailyGoals } from "@/hooks/useMeals";
import { useDrawerStore } from "@/stores/drawer-store";
import { DateNavigator } from "@/components/DateNavigator";
import { NutritionSummary } from "@/components/NutritionSummary";
import { Button } from "@/components/ui/button";
import { Plus, Target, ChevronRight } from "lucide-react";
import type { NutritionValues } from "@/types";

export function LogPage() {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const meals = useMealsByDate(date);
  const goals = useDailyGoals(date);
  const { openMealDrawer, openGoalsDrawer } = useDrawerStore();

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
    <div className="flex flex-col h-full bg-background relative">
      {/* 1. Date Navigation */}
      <DateNavigator date={date} onChange={setDate} className="shrink-0" />

      {/* 2. Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {/* Nutrition Summary Card */}
        <div className="p-4 bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm text-muted-foreground">
              Tagesübersicht
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => openGoalsDrawer(date)}>
              <Target className="h-4 w-4" />
            </Button>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <NutritionSummary current={totals} goals={goals ?? fallbackGoals} />
          </div>
        </div>

        {/* Meals List */}
        <div className="px-4 py-2 space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground pl-1">
            Mahlzeiten
          </h3>

          <div className="space-y-3">
            {meals?.map((meal) => (
              <div
                key={meal.id}
                className="group rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-all active:scale-[0.99]"
                onClick={() => openMealDrawer("edit", meal.id)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground/80">
                      {meal.time}
                    </span>
                    <span className="text-sm font-medium">{meal.name}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                </div>

                {/* Meal Mini Summary */}
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
                    Prot
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

                {/* Items preview (optional) */}
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
          </div>
        </div>
      </div>

      {/* Floating Action Button (FAB) */}
      <div className="absolute right-6 bottom-6 z-50">
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
          onClick={() => openMealDrawer("create", undefined, date)}>
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
