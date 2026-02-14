import {
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDrawerStore } from "@/stores/drawer-store";
import { db } from "@/lib/db";
import { useCallback, useEffect } from "react";
import { Save } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export function GoalsDrawerContent() {
  const { goalsDraft, closeGoalsDrawer, updateGoalsDraft } = useDrawerStore();

  const {
    open,
    caloriesGoal,
    fatGoal,
    carbsGoal,
    proteinGoal,
    sugarGoal,
    saltGoal,
    fiberGoal,
    overrideDate,
  } = goalsDraft;

  const loadGoals = useCallback(async () => {
    // 1. Load defaults
    const defaults = await db.dailyGoals.orderBy("id").first();

    // 2. If override date, check for override
    const current = {
      caloriesGoal: defaults?.caloriesGoal ?? 2700,
      fatGoal: defaults?.fatGoal ?? 90,
      carbsGoal: defaults?.carbsGoal ?? 304,
      proteinGoal: defaults?.proteinGoal ?? 169,
      sugarGoal: defaults?.sugarGoal ?? 50,
      saltGoal: defaults?.saltGoal ?? 6,
      fiberGoal: defaults?.fiberGoal ?? 30,
    };

    if (overrideDate) {
      const override = await db.dailyGoalOverrides
        .where("date")
        .equals(overrideDate)
        .first();
      if (override) {
        // Merge defined override values
        if (override.caloriesGoal) current.caloriesGoal = override.caloriesGoal;
        if (override.fatGoal) current.fatGoal = override.fatGoal;
        if (override.carbsGoal) current.carbsGoal = override.carbsGoal;
        if (override.proteinGoal) current.proteinGoal = override.proteinGoal;
        if (override.sugarGoal) current.sugarGoal = override.sugarGoal;
        if (override.saltGoal) current.saltGoal = override.saltGoal;
        if (override.fiberGoal) current.fiberGoal = override.fiberGoal;
      }
    }

    if (current) {
      updateGoalsDraft({
        caloriesGoal: current.caloriesGoal || 2000,
        fatGoal: current.fatGoal || 0,
        carbsGoal: current.carbsGoal || 0,
        proteinGoal: current.proteinGoal || 0,
        sugarGoal: current.sugarGoal || 0,
        saltGoal: current.saltGoal || 0,
        fiberGoal: current.fiberGoal || 0,
      });
    }
  }, [overrideDate, updateGoalsDraft]);

  useEffect(() => {
    if (open) {
      loadGoals();
    }
  }, [open, loadGoals]);

  const handleSave = async () => {
    try {
      if (overrideDate) {
        // Save override
        // Check if exists
        const existing = await db.dailyGoalOverrides
          .where("date")
          .equals(overrideDate)
          .first();
        if (existing) {
          await db.dailyGoalOverrides.update(existing.id!, {
            caloriesGoal,
            fatGoal,
            carbsGoal,
            proteinGoal,
            sugarGoal,
            saltGoal,
            fiberGoal,
          });
        } else {
          await db.dailyGoalOverrides.add({
            date: overrideDate,
            caloriesGoal,
            fatGoal,
            carbsGoal,
            proteinGoal,
            sugarGoal,
            saltGoal,
            fiberGoal,
          });
        }
      } else {
        // Save defaults
        // Update first record
        const first = await db.dailyGoals.orderBy("id").first();
        if (first) {
          await db.dailyGoals.update(first.id!, {
            caloriesGoal,
            fatGoal,
            carbsGoal,
            proteinGoal,
            sugarGoal,
            saltGoal,
            fiberGoal,
          });
        } else {
          await db.dailyGoals.add({
            caloriesGoal,
            fatGoal,
            carbsGoal,
            proteinGoal,
            sugarGoal,
            saltGoal,
            fiberGoal,
          });
        }
      }
      closeGoalsDrawer();
    } catch (e) {
      console.error("Failed to save goals", e);
    }
  };

  const title = overrideDate
    ? `Ziele für ${format(new Date(overrideDate), "dd.MM.yyyy", { locale: de })}`
    : "Standard-Tagesziele";

  return (
    <DrawerContent>
      <div className="mx-auto w-full max-w-md">
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>

        <div className="p-4 grid gap-4 overflow-y-auto max-h-[70vh]">
          <div className="space-y-1">
            <Label>Kalorien (kcal)</Label>
            <Input
              type="number"
              value={caloriesGoal}
              onChange={(e) =>
                updateGoalsDraft({
                  caloriesGoal: parseFloat(e.target.value) || 0,
                })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Fett (g)</Label>
              <Input
                type="number"
                value={fatGoal}
                onChange={(e) =>
                  updateGoalsDraft({ fatGoal: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Kohlenhydrate (g)</Label>
              <Input
                type="number"
                value={carbsGoal}
                onChange={(e) =>
                  updateGoalsDraft({
                    carbsGoal: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Eiweiß (g)</Label>
              <Input
                type="number"
                value={proteinGoal}
                onChange={(e) =>
                  updateGoalsDraft({
                    proteinGoal: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Zucker (g)</Label>
              <Input
                type="number"
                value={sugarGoal}
                onChange={(e) =>
                  updateGoalsDraft({
                    sugarGoal: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Salz (g)</Label>
              <Input
                type="number"
                value={saltGoal}
                onChange={(e) =>
                  updateGoalsDraft({
                    saltGoal: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Ballaststoffe (g)</Label>
              <Input
                type="number"
                value={fiberGoal}
                onChange={(e) =>
                  updateGoalsDraft({
                    fiberGoal: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
        </div>

        <DrawerFooter>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={closeGoalsDrawer}>
              Abbrechen
            </Button>
            <Button className="flex-1 gap-2" onClick={handleSave}>
              <Save className="h-4 w-4" />
              Speichern
            </Button>
          </div>
        </DrawerFooter>
      </div>
    </DrawerContent>
  );
}
