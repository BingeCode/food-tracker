import {
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDrawerStore } from "@/stores/drawer-store";
import { IngredientSearch } from "@/components/IngredientSearch";
import { db } from "@/lib/db";
import { useState, useEffect, useMemo } from "react";
import { Scan, Save, X } from "lucide-react";
import type {
  MealItemDraft,
  Ingredient,
  Recipe,
  RecipeIngredient,
} from "@/types";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { fetchProductByBarcode } from "@/lib/openfoodfacts";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function RecipeDrawerContent() {
  const {
    recipeDraft,
    closeRecipeDrawer,
    updateRecipeDraft,
    addRecipeItem,
    removeRecipeItem,
    updateRecipeItem,
    clearRecipeDraft,
  } = useDrawerStore();

  const { open, mode, editId, name, items, servings } = recipeDraft;
  const isOnline = useOnlineStatus();
  const [isScanning, setIsScanning] = useState(false);

  // Load recipe data if in edit mode
  useEffect(() => {
    if (open && mode === "edit" && editId) {
      db.recipes.get(editId).then(async (recipe) => {
        if (recipe) {
          const dbItems = await db.recipeIngredients
            .where("recipeId")
            .equals(recipe.id!)
            .toArray();

          const draftItems: MealItemDraft[] = [];

          for (const item of dbItems) {
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
          }

          updateRecipeDraft({
            name: recipe.name,
            servings: recipe.servings,
            items: draftItems,
          });
        }
      });
    }
  }, [open, mode, editId, updateRecipeDraft]);

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
    addRecipeItem(newItem);
  };

  const handleScan = async (code: string) => {
    setIsScanning(false);
    const localIng = await db.ingredients.where("barcode").equals(code).first();
    if (localIng) {
      handleSelectIngredient(localIng);
      return;
    }

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
        addRecipeItem(newItem);
        return;
      }
    }

    alert("Produkt nicht gefunden.");
  };

  const handleSaveRecipe = async () => {
    if (!name.trim() || items.length === 0) return;

    try {
      const recipeData: Omit<Recipe, "id" | "createdAt"> = {
        name,
        servings: servings || 1,
        updatedAt: new Date(),
      };

      let currentRecipeId: number | undefined = editId;

      if (mode === "edit" && editId) {
        await db.recipes.update(editId, recipeData);
        // Clear old items
        const oldItems = await db.recipeIngredients
          .where("recipeId")
          .equals(editId)
          .toArray();
        await db.recipeIngredients.bulkDelete(
          oldItems.map((i) => i.id!).filter(Boolean),
        );
      } else {
        const id = await db.recipes.add({
          ...recipeData,
          createdAt: new Date(),
        });
        currentRecipeId = id;
      }

      // Add items
      // Note: We only support ingredients in recipes for now (no nested recipes or manual items without ingredientId)
      // If we have manual items (from scan not saved), we should probably save them as ingredients first?
      // Or just skip them (bad UX).
      // Let's silently create "Ingredient" for manual items so we can link them?
      // Or: RecipeIngredient schema requires ingredientId.
      // We MUST ensure all items have ingredientId.

      const itemsToSave: Omit<RecipeIngredient, "id">[] = [];
      for (const item of items) {
        let ingredientId = item.ingredientId;

        if (!ingredientId) {
          // Create new ingredient on the fly
          // This happens if we scanned a product but didn't save it to DB yet
          const newIngId = await db.ingredients.add({
            name: item.name,
            unit: item.unit,
            calories: item.caloriesPer100,
            fat: item.fatPer100,
            carbs: item.carbsPer100,
            sugar: item.sugarPer100,
            protein: item.proteinPer100,
            salt: item.saltPer100,
            fiber: item.fiberPer100,
            defaultServing: 100,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          ingredientId = newIngId;
        }

        if (!ingredientId) {
          continue;
        }

        itemsToSave.push({
          recipeId: currentRecipeId!,
          ingredientId,
          amount: item.amount,
        });
      }

      await db.recipeIngredients.bulkAdd(itemsToSave);

      clearRecipeDraft();
      closeRecipeDrawer();
    } catch (error) {
      console.error("Failed to save recipe", error);
    }
  };

  const totals = useMemo(() => {
    const total = items.reduce(
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

    // Divide by servings for display "Per Serving"?
    // NutritionSummary usually expects totals. We can show totals and let user do mental math, or show per serving.
    // Let's show "Total for whole recipe" and maybe "Per serving" text below.
    return total;
  }, [items]);

  const perServing = useMemo(() => {
    const s = servings || 1;
    return {
      calories: totals.calories / s,
      fat: totals.fat / s,
      carbs: totals.carbs / s,
      sugar: totals.sugar / s,
      protein: totals.protein / s,
      salt: totals.salt / s,
      fiber: totals.fiber / s,
    };
  }, [totals, servings]);

  return (
    <DrawerContent className="h-[95vh] flex flex-col">
      <div className="mx-auto w-full max-w-md flex flex-col h-full bg-background rounded-t-xl overflow-hidden">
        <DrawerHeader className="border-b shrink-0">
          <div className="flex flex-col gap-4">
            <DrawerTitle>
              {mode === "create" ? "Rezept erstellen" : "Rezept bearbeiten"}
            </DrawerTitle>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="r-name" className="sr-only">
                  Name
                </Label>
                <Input
                  id="r-name"
                  placeholder="Rezept Name"
                  value={name}
                  onChange={(e) => updateRecipeDraft({ name: e.target.value })}
                />
              </div>
              <div className="w-24">
                <Label htmlFor="r-servings" className="sr-only">
                  Portionen
                </Label>
                <div className="relative">
                  <Input
                    id="r-servings"
                    type="number"
                    min={1}
                    value={servings}
                    onChange={(e) =>
                      updateRecipeDraft({
                        servings: parseFloat(e.target.value) || 1,
                      })
                    }
                    className="pr-8"
                  />
                  <span className="absolute right-2 top-2.5 text-xs text-muted-foreground">
                    Port.
                  </span>
                </div>
              </div>
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
                <p>Keine Zutaten.</p>
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
                        value={item.amount || ""}
                        onChange={(e) =>
                          updateRecipeItem(index, {
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
                      onClick={() => removeRecipeItem(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer / Summary */}
        <div className="border-t bg-card shrink-0 p-4 pb-8 space-y-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pro Portion
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
              <div>
                <span className="font-semibold text-foreground">
                  {Math.round(perServing.calories)}
                </span>{" "}
                kcal
              </div>
              <div>
                <span className="font-semibold text-foreground">
                  {Math.round(perServing.protein)}g
                </span>{" "}
                Prot
              </div>
              <div>
                <span className="font-semibold text-foreground">
                  {Math.round(perServing.carbs)}g
                </span>{" "}
                KH
              </div>
              <div>
                <span className="font-semibold text-foreground">
                  {Math.round(perServing.fat)}g
                </span>{" "}
                Fett
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={closeRecipeDrawer}>
              Abbrechen
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleSaveRecipe}
              disabled={!name || items.length === 0}>
              <Save className="h-4 w-4" />
              Speichern
            </Button>
          </div>
        </div>

        {/* Scanner Overlay */}
        <BarcodeScanner
          open={isScanning}
          onClose={() => setIsScanning(false)}
          onScan={handleScan}
        />
      </div>
    </DrawerContent>
  );
}
