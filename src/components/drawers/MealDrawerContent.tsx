import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDrawerStore } from "@/stores/drawer-store";
import { IngredientSearch } from "@/components/IngredientSearch";
import { db } from "@/lib/db";
import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Save, Trash2, X, Scan } from "lucide-react";
import type {
  MealItemDraft,
  Ingredient,
  Meal,
  MealItem,
  Recipe,
} from "@/types";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { fetchProductByBarcode } from "@/lib/openfoodfacts";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useViewTransitionNavigate } from "@/hooks/useViewTransitionNavigate";
import { useRecipes } from "@/hooks/useMeals";
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
  const { navigateBack } = useViewTransitionNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isRecipeSearchFocused, setIsRecipeSearchFocused] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const recipeQuery = searchTerm.trim().length > 0 ? searchTerm : undefined;
  const recipes = useRecipes(recipeQuery);

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
                  sourceRecipeName: item.sourceRecipeName,
                  sourceRecipeBaseAmount: item.sourceRecipeBaseAmount,
                  sourceRecipePortions: item.sourceRecipePortions,
                  sourceRecipeTotalServings: item.sourceRecipeTotalServings,
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

  const handleSelectRecipe = async (recipe: Recipe) => {
    if (!recipe.id) return;

    const recipeItems = await db.recipeIngredients
      .where("recipeId")
      .equals(recipe.id)
      .toArray();

    const ingredientMap = new Map<number, Ingredient>();
    const ingredientIds = Array.from(
      new Set(recipeItems.map((item) => item.ingredientId)),
    );

    for (const ingredientId of ingredientIds) {
      const ingredient = await db.ingredients.get(ingredientId);
      if (ingredient?.id) {
        ingredientMap.set(ingredient.id, ingredient);
      }
    }

    const draftItems: MealItemDraft[] = [];
    for (const item of recipeItems) {
      const ingredient = ingredientMap.get(item.ingredientId);
      if (!ingredient || ingredient.id === undefined) {
        continue;
      }

      draftItems.push({
        ingredientId: ingredient.id,
        name: ingredient.name,
        amount: item.amount * (1 / Math.max(1, recipe.servings)),
        sourceRecipeName: recipe.name,
        sourceRecipeBaseAmount: item.amount,
        sourceRecipePortions: 1,
        sourceRecipeTotalServings: Math.max(1, recipe.servings),
        unit: ingredient.unit,
        caloriesPer100: ingredient.calories,
        fatPer100: ingredient.fat,
        carbsPer100: ingredient.carbs,
        sugarPer100: ingredient.sugar,
        proteinPer100: ingredient.protein,
        saltPer100: ingredient.salt,
        fiberPer100: ingredient.fiber,
      });
    }

    updateMealDraft({ items: [...items, ...draftItems] });
    setSearchTerm("");
    setIsRecipeSearchFocused(false);
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
      const recipeNames = Array.from(
        new Set(items.map((item) => item.sourceRecipeName).filter(Boolean)),
      ) as string[];
      const ingredientNames = Array.from(
        new Set(items.map((item) => item.name).filter(Boolean)),
      );
      const mealName =
        recipeNames.length > 0
          ? recipeNames.join(", ")
          : ingredientNames.length > 0
            ? ingredientNames.join(", ")
            : "Mahlzeit";

      const mealData: Omit<Meal, "id" | "createdAt"> = {
        date,
        time,
        name: mealName,
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
          sourceRecipeName: item.sourceRecipeName,
          sourceRecipeBaseAmount: item.sourceRecipeBaseAmount,
          sourceRecipePortions: item.sourceRecipePortions,
          sourceRecipeTotalServings: item.sourceRecipeTotalServings,
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
      navigateBack();
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
      navigateBack();
    } catch (error) {
      console.error("Failed to delete meal", error);
    }
  };

  const handleBack = () => {
    closeMealDrawer();
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

  const groupedItems = useMemo(() => {
    const recipeGroups = new Map<
      string,
      Array<{ item: MealItemDraft; index: number }>
    >();
    const otherItems: Array<{ item: MealItemDraft; index: number }> = [];

    items.forEach((item, index) => {
      if (item.sourceRecipeName) {
        const existing = recipeGroups.get(item.sourceRecipeName) ?? [];
        recipeGroups.set(item.sourceRecipeName, [...existing, { item, index }]);
        return;
      }

      otherItems.push({ item, index });
    });

    const sections: Array<{
      label?: string;
      isRecipeGroup: boolean;
      portions: number;
      entries: Array<{ item: MealItemDraft; index: number }>;
    }> = [];

    recipeGroups.forEach((entries, recipeName) => {
      const firstEntry = entries[0]?.item;
      sections.push({
        label: recipeName,
        isRecipeGroup: true,
        portions: firstEntry?.sourceRecipePortions || 1,
        entries,
      });
    });

    if (otherItems.length > 0) {
      sections.push({
        label: sections.length > 0 ? "Weitere Zutaten" : undefined,
        isRecipeGroup: false,
        portions: 1,
        entries: otherItems,
      });
    }

    return sections;
  }, [items]);

  const handleRecipePortionsChange = (
    recipeName: string,
    newPortions: number,
  ) => {
    const safePortions = newPortions > 0 ? newPortions : 1;

    const updatedItems = items.map((item) => {
      if (item.sourceRecipeName !== recipeName) {
        return item;
      }

      const currentPortions = item.sourceRecipePortions || 1;
      const baseAmount =
        item.sourceRecipeBaseAmount ??
        (currentPortions > 0 ? item.amount / currentPortions : item.amount);
      const totalServings = Math.max(1, item.sourceRecipeTotalServings || 1);

      return {
        ...item,
        amount: baseAmount * (safePortions / totalServings),
        sourceRecipeBaseAmount: baseAmount,
        sourceRecipePortions: safePortions,
        sourceRecipeTotalServings: totalServings,
      };
    });

    updateMealDraft({ items: updatedItems });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Zurück</span>
        </Button>
        <h2 className="text-foreground font-semibold">
          {mode === "create" ? "Mahlzeit hinzufügen" : "Mahlzeit bearbeiten"}
        </h2>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={date}
          onChange={(e) => updateMealDraft({ date: e.target.value })}
          className="w-auto h-9 text-sm flex-1"
        />
        <Input
          type="time"
          value={time}
          onChange={(e) => updateMealDraft({ time: e.target.value })}
          className="w-24 h-9 text-sm flex-1"
        />
      </div>
      <div className="relative">
        <Input
          type="search"
          placeholder="Rezept suchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsRecipeSearchFocused(true)}
          onBlur={() => {
            setTimeout(() => setIsRecipeSearchFocused(false), 200);
          }}
          className="pr-9"
        />

        {searchTerm ? (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setSearchTerm("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Suche zurücksetzen">
            <X className="h-4 w-4" />
          </button>
        ) : null}

        {isRecipeSearchFocused && searchTerm.trim().length > 0 ? (
          <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-background border rounded-md shadow-lg z-50">
            {!recipes || recipes.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">
                Keine Rezepte gefunden.
              </div>
            ) : (
              recipes.slice(0, 8).map((recipe) => (
                <button
                  key={recipe.id}
                  type="button"
                  className="w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-muted/40"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void handleSelectRecipe(recipe)}>
                  <div className="text-sm font-medium">{recipe.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {recipe.servings}{" "}
                    {recipe.servings === 1 ? "Portion" : "Portionen"}
                  </div>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>

      <div className="flex gap-2">
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

      {/* Items List */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
        {groupedItems.map((section, sectionIndex) => (
          <div
            key={`${section.label ?? "items"}-${sectionIndex}`}
            className="space-y-2">
            {section.label ? (
              <div className="flex items-center justify-between gap-2 px-1">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.label}
                </div>
                {section.isRecipeGroup ? (
                  <select
                    value={section.portions}
                    onChange={(e) =>
                      handleRecipePortionsChange(
                        section.label!,
                        parseInt(e.target.value) || 1,
                      )
                    }
                    className="h-8 w-20 rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-xs">
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            ) : null}

            {section.entries.map(({ item, index }) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card/50">
                <div className="flex-1 overflow-hidden">
                  <div className="font-medium text-sm truncate">
                    {item.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {Math.round(item.caloriesPer100)} kcal / 100
                    {item.unit}
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
            ))}
          </div>
        ))}
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
    </>
  );
}
