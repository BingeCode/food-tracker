import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDrawerStore } from "@/stores/drawer-store";
import { IngredientSearch } from "@/components/IngredientSearch";
import { db } from "@/lib/db";
import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Plus, Scan, Save, Trash2, X } from "lucide-react";
import type {
  MealItemDraft,
  Ingredient,
  Recipe,
  RecipeIngredient,
} from "@/types";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { fetchProductByBarcode } from "@/lib/openfoodfacts";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useViewTransitionNavigate } from "@/hooks/useViewTransitionNavigate";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const { navigateBack } = useViewTransitionNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

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

      const itemsToSave: Omit<RecipeIngredient, "id">[] = [];
      for (const item of items) {
        let ingredientId = item.ingredientId;

        if (!ingredientId) {
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

        if (!ingredientId) continue;

        itemsToSave.push({
          recipeId: currentRecipeId!,
          ingredientId,
          amount: item.amount,
        });
      }

      await db.recipeIngredients.bulkAdd(itemsToSave);

      clearRecipeDraft();
      closeRecipeDrawer();
      navigateBack();
    } catch (error) {
      console.error("Failed to save recipe", error);
    }
  };

  const handleDeleteRecipe = async () => {
    if (mode !== "edit" || !editId) return;

    try {
      const recipeItems = await db.recipeIngredients
        .where("recipeId")
        .equals(editId)
        .toArray();
      await db.recipeIngredients.bulkDelete(
        recipeItems.map((item) => item.id!).filter(Boolean),
      );
      await db.recipes.delete(editId);

      setConfirmDeleteOpen(false);
      clearRecipeDraft();
      closeRecipeDrawer();
      navigateBack();
    } catch (error) {
      console.error("Failed to delete recipe", error);
    }
  };

  const handleBack = () => {
    closeRecipeDrawer();
    navigateBack();
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
    <>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Zurück</span>
        </Button>
        <h2 className="text-foreground font-semibold">
          {mode === "create" ? "Rezept erstellen" : "Rezept bearbeiten"}
        </h2>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 space-y-1">
          <Label htmlFor="r-name">Rezept Name</Label>
          <Input
            id="r-name"
            value={name}
            placeholder="Name eingeben..."
            onChange={(e) => updateRecipeDraft({ name: e.target.value })}
          />
        </div>
        <div className="w-20 space-y-1">
          <Label htmlFor="r-servings">Portionen</Label>
          <select
            id="r-servings"
            value={servings}
            onChange={(e) =>
              updateRecipeDraft({
                servings: parseInt(e.target.value) || 1,
              })
            }
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs">
            {Array.from({ length: 100 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-card shrink-0 z-10">
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

      <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 rounded-lg border bg-card/50">
            <div className="flex-1 overflow-hidden">
              <div className="font-medium text-sm truncate">{item.name}</div>
              <div className="text-xs text-muted-foreground">
                {Math.round(item.caloriesPer100)} kcal / 100{item.unit}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={async () => {
                  let step = 100;

                  if (item.ingredientId) {
                    const ingredient = await db.ingredients.get(
                      item.ingredientId,
                    );
                    step = ingredient?.defaultServing ?? 100;
                  }

                  updateRecipeItem(index, {
                    amount: Math.max(0, (item.amount || 0) - step),
                  });
                }}>
                <span className="text-base leading-none">-</span>
                <span className="sr-only">Menge verringern</span>
              </Button>

              <div className="relative w-20">
                <Input
                  type="number"
                  inputMode="tel"
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
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={async () => {
                  let step = 100;

                  if (item.ingredientId) {
                    const ingredient = await db.ingredients.get(
                      item.ingredientId,
                    );
                    step = ingredient?.defaultServing ?? 100;
                  }

                  updateRecipeItem(index, {
                    amount: (item.amount || 0) + step,
                  });
                }}>
                <Plus className="h-4 w-4" />
                <span className="sr-only">Menge erhöhen</span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                onClick={() => removeRecipeItem(index)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t">
        <div className="px-4 py-3 space-y-1">
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

        <div className="p-10 pt-6 pb-6">
          <div className="flex gap-2">
            {mode === "edit" && editId ? (
              <Button
                variant="destructive"
                size="icon"
                className="shrink-0"
                onClick={() => setConfirmDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Rezept löschen</span>
              </Button>
            ) : null}
            <Button
              className="flex-1"
              onClick={handleSaveRecipe}
              disabled={!name || items.length === 0}>
              <Save className="h-4 w-4" />
              Speichern
            </Button>
          </div>
        </div>
      </div>

      <BarcodeScanner
        open={isScanning}
        onClose={() => setIsScanning(false)}
        onScan={handleScan}
      />

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rezept löschen?</DialogTitle>
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
            <Button variant="destructive" onClick={handleDeleteRecipe}>
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
