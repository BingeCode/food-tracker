import {
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDrawerStore } from "@/stores/drawer-store";
import { IngredientSearch } from "@/components/IngredientSearch";
import { db } from "@/lib/db";
import { useState, useEffect, useMemo } from "react";
import { Scan, Save, Trash2, X } from "lucide-react";
import type { MealItemDraft, Ingredient, Meal, MealItem } from "@/types";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { fetchProductByBarcode } from "@/lib/openfoodfacts";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function MealDrawerContent() {
  const {
    mealDraft,
    closeMealDrawer,
    updateMealDraft,
    addMealItem,
    removeMealItem,
    updateMealItem,
    clearMealDraft,
  } = useDrawerStore();

  const { open, mode, editId, date, time, items } = mealDraft;
  const isOnline = useOnlineStatus();
  const [isScanning, setIsScanning] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Load meal data if in edit mode
  useEffect(() => {
    if (open && mode === "edit" && editId) {
      db.meals.get(editId).then(async (meal) => {
        if (meal) {
          const dbItems = await db.mealItems
            .where("mealId")
            .equals(meal.id!)
            .toArray();

          const draftItems: MealItemDraft[] = [];

          for (const item of dbItems) {
            if (item.ingredientId) {
              const ing = await db.ingredients.get(item.ingredientId);
              if (ing) {
                draftItems.push({
                  ingredientId: ing.id,
                  name: ing.name,
                  amount: item.amount,
                  unit: ing.unit,
                  caloriesPer100: ing.calories,
                  fatPer100: ing.fat,
                  carbsPer100: ing.carbs,
                  sugarPer100: ing.sugar,
                  proteinPer100: ing.protein,
                  saltPer100: ing.salt,
                  fiberPer100: ing.fiber,
                });
              }
            } else {
              // Manual item logic
              // Stored manual values are total for entry.
              // Convert to Per100 for draft consistency.
              const factor = item.amount > 0 ? 100 / item.amount : 0;

              draftItems.push({
                name: item.manualName || "Unbekannt",
                amount: item.amount,
                unit: "g",
                manualName: item.manualName,
                caloriesPer100: (item.manualCalories || 0) * factor,
                fatPer100: (item.manualFat || 0) * factor,
                carbsPer100: (item.manualCarbs || 0) * factor,
                sugarPer100: (item.manualSugar || 0) * factor,
                proteinPer100: (item.manualProtein || 0) * factor,
                saltPer100: (item.manualSalt || 0) * factor,
                fiberPer100: (item.manualFiber || 0) * factor,
              });
            }
          }

          updateMealDraft({
            date: meal.date,
            time: meal.time,
            items: draftItems,
          });
        }
      });
    }
  }, [open, mode, editId, updateMealDraft]);

  const handleSelectIngredient = (ing: Ingredient) => {
    const newItem: MealItemDraft = {
      ingredientId: ing.id,
      name: ing.name,
      amount: ing.defaultServing || 100,
      unit: ing.unit,
      caloriesPer100: ing.calories,
      fatPer100: ing.fat,
      carbsPer100: ing.carbs,
      sugarPer100: ing.sugar,
      proteinPer100: ing.protein,
      saltPer100: ing.salt,
      fiberPer100: ing.fiber,
    };
    addMealItem(newItem);
  };

  const handleScan = async (code: string) => {
    setIsScanning(false);
    // 1. Search local DB for barcode
    const localIng = await db.ingredients.where("barcode").equals(code).first();
    if (localIng) {
      handleSelectIngredient(localIng);
      return;
    }

    // 2. Fetch API
    if (isOnline) {
      const product = await fetchProductByBarcode(code);
      if (product.found) {
        const newItem: MealItemDraft = {
          name: product.name || "Gescanntes Produkt",
          amount: 100,
          unit: product.unit,
          caloriesPer100: product.calories,
          fatPer100: product.fat,
          carbsPer100: product.carbs,
          sugarPer100: product.sugar,
          proteinPer100: product.protein,
          saltPer100: product.salt,
          fiberPer100: product.fiber,
          manualName: product.name,
        };
        addMealItem(newItem);
        return;
      }
    }

    alert("Produkt nicht gefunden (oder offline).");
  };

  const handleCreateMeal = async () => {
    if (items.length === 0) return;

    try {
      const mealData: Omit<Meal, "id" | "createdAt"> = {
        date,
        time,
        name: "Mahlzeit",
        isManual: false,
        updatedAt: new Date(),
      };

      let currentMealId: number | undefined = editId;

      if (mode === "edit" && editId) {
        await db.meals.update(editId, mealData);
        // Clear old items
        const oldItems = await db.mealItems
          .where("mealId")
          .equals(editId)
          .toArray();
        await db.mealItems.bulkDelete(
          oldItems.map((i) => i.id!).filter(Boolean),
        );
      } else {
        const id = await db.meals.add({
          ...mealData,
          createdAt: new Date(),
        });
        currentMealId = id;
      }

      // Add items
      const mealItemsToInsert: Omit<MealItem, "id">[] = items.map((item) => {
        const factor = item.amount / 100;
        return {
          mealId: currentMealId!,
          ingredientId: item.ingredientId,
          amount: item.amount,
          manualName: item.ingredientId ? undefined : item.name,
          manualCalories: item.ingredientId
            ? undefined
            : item.caloriesPer100 * factor,
          manualFat: item.ingredientId ? undefined : item.fatPer100 * factor,
          manualCarbs: item.ingredientId
            ? undefined
            : item.carbsPer100 * factor,
          manualSugar: item.ingredientId
            ? undefined
            : item.sugarPer100 * factor,
          manualProtein: item.ingredientId
            ? undefined
            : item.proteinPer100 * factor,
          manualSalt: item.ingredientId ? undefined : item.saltPer100 * factor,
          manualFiber: item.ingredientId
            ? undefined
            : item.fiberPer100 * factor,
        };
      });

      await Promise.all(
        mealItemsToInsert.map((mealItem) => db.mealItems.add(mealItem)),
      );

      clearMealDraft();
      closeMealDrawer();
    } catch (error) {
      console.error("Failed to save meal", error);
    }
  };

  const handleDeleteMeal = async () => {
    if (mode !== "edit" || !editId) return;

    try {
      const mealItems = await db.mealItems
        .where("mealId")
        .equals(editId)
        .toArray();
      await db.mealItems.bulkDelete(
        mealItems.map((item) => item.id!).filter(Boolean),
      );
      await db.meals.delete(editId);

      setConfirmDeleteOpen(false);
      clearMealDraft();
      closeMealDrawer();
    } catch (error) {
      console.error("Failed to delete meal", error);
    }
  };

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const factor = item.amount / 100;
        return {
          calories: acc.calories + item.caloriesPer100 * factor,
          fat: acc.fat + item.fatPer100 * factor,
          carbs: acc.carbs + item.carbsPer100 * factor,
          sugar: acc.sugar + item.sugarPer100 * factor,
          protein: acc.protein + item.proteinPer100 * factor,
          salt: acc.salt + item.saltPer100 * factor,
          fiber: acc.fiber + item.fiberPer100 * factor,
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
  }, [items]);

  return (
    <DrawerContent className="h-[95vh] flex flex-col">
      <div className="mx-auto w-full max-w-md flex flex-col h-full bg-background rounded-t-xl overflow-hidden">
        <DrawerHeader className="border-b shrink-0">
          <div className="flex items-center justify-between">
            <DrawerTitle>
              {mode === "create"
                ? "Mahlzeit hinzufügen"
                : "Mahlzeit bearbeiten"}
            </DrawerTitle>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={date}
                onChange={(e) => updateMealDraft({ date: e.target.value })}
                className="w-auto h-9 text-sm"
              />
              <Input
                type="time"
                value={time}
                onChange={(e) => updateMealDraft({ time: e.target.value })}
                className="w-24 h-9 text-sm"
              />
            </div>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-hidden flex flex-col relative">
          {/* Add Item Section */}
          <div className="p-4 border-b bg-card shrink-0 z-10">
            <div className="flex gap-2 mb-2">
              <IngredientSearch
                onSelect={handleSelectIngredient}
                className="flex-1"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => setIsScanning(true)}>
                <Scan className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
                <p>Noch keine Lebensmittel hinzugefügt.</p>
                <p>Suche oder scanne eine Zutat.</p>
              </div>
            ) : (
              items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card/50">
                  <div className="flex-1 overflow-hidden">
                    <div className="font-medium text-sm truncate">
                      {item.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {Math.round(item.caloriesPer100)} kcal / 100{item.unit}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative w-24">
                      <Input
                        type="number"
                        inputMode="tel"
                        value={item.amount || ""}
                        onChange={(e) =>
                          updateMealItem(index, {
                            amount: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="h-8 pr-8 text-right bg-background"
                      />
                      <span className="absolute right-3 top-2 text-xs text-muted-foreground">
                        {item.unit}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => removeMealItem(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer / Summary */}
        <div className="shrink-0 border-t">
          <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground px-4 py-3">
            <div>
              <span className="font-semibold text-foreground">
                {Math.round(totals.calories)}
              </span>{" "}
              kcal
            </div>
            <div>
              <span className="font-semibold text-foreground">
                {Math.round(totals.protein)}g
              </span>{" "}
              P
            </div>
            <div>
              <span className="font-semibold text-foreground">
                {Math.round(totals.carbs)}g
              </span>{" "}
              KH
            </div>
            <div>
              <span className="font-semibold text-foreground">
                {Math.round(totals.fat)}g
              </span>{" "}
              Fett
            </div>
          </div>

          <div className="p-10 pt-6 pb-6">
            <div className="flex gap-2">
              {mode === "edit" && editId ? (
                <Button
                  variant="destructive"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setConfirmDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Mahlzeit löschen</span>
                </Button>
              ) : null}
              <Button
                className="flex-1"
                onClick={handleCreateMeal}
                disabled={items.length === 0}>
                <Save className="h-4 w-4" />
                Speichern
              </Button>
            </div>
          </div>
        </div>

        {/* Scanner Overlay */}
        <BarcodeScanner
          open={isScanning}
          onClose={() => setIsScanning(false)}
          onScan={handleScan}
        />

        <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mahlzeit löschen?</DialogTitle>
              <DialogDescription>
                Diese Aktion kann nicht rückgängig gemacht werden.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmDeleteOpen(false)}>
                Abbrechen
              </Button>
              <Button variant="destructive" onClick={handleDeleteMeal}>
                Löschen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DrawerContent>
  );
}
