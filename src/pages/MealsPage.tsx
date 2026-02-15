import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IngredientSearch } from "@/components/IngredientSearch";
import { db } from "@/lib/db";
import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Save, Trash2, X, Scan } from "lucide-react";
import type { Ingredient, Recipe } from "@/types";
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

interface DraftItem {
  ingredientId: number;
  name: string;
  amount: number;
  baseAmount: number;
  unit: "g" | "ml";
  calories: number;
  fat: number;
  carbs: number;
  sugar: number;
  protein: number;
  salt: number;
  fiber: number;
  fromRecipe?: boolean;
}

export function MealsPage() {
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("id")
    ? Number(searchParams.get("id"))
    : undefined;
  const paramDate = searchParams.get("date");
  const mode = editId ? "edit" : "create";

  const [date, setDate] = useState(
    paramDate || format(new Date(), "yyyy-MM-dd"),
  );
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });
  const [items, setItems] = useState<DraftItem[]>([]);

  const isOnline = useOnlineStatus();
  const { navigateBack } = useViewTransitionNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isRecipeSearchFocused, setIsRecipeSearchFocused] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecipeName, setSelectedRecipeName] = useState<string | null>(
    null,
  );
  const [recipePortions, setRecipePortions] = useState(1);

  const recipeSearchRef = useRef<HTMLInputElement>(null);
  const recipeQuery = searchTerm.trim().length > 0 ? searchTerm : undefined;
  const recipes = useRecipes(recipeQuery);

  // Auto-focus recipe search on mount (create mode)
  // Using a timeout to trigger the virtual keyboard on iOS
  useEffect(() => {
    if (mode === "create") {
      recipeSearchRef.current?.focus();
    }
  }, [mode]);

  // Load meal data if editing
  useEffect(() => {
    if (mode === "edit" && editId) {
      db.meals.get(editId).then(async (meal) => {
        if (!meal) return;
        const dbItems = await db.mealIngredients
          .where("mealId")
          .equals(meal.id)
          .toArray();

        const draftItems: DraftItem[] = await Promise.all(
          dbItems.map(async (item) => {
            const ing = await db.ingredients.get(item.ingredientId);
            return {
              ingredientId: item.ingredientId,
              name: ing?.name ?? "Unbekannt",
              amount: item.amount,
              baseAmount: item.amount,
              unit: item.unit,
              calories: item.calories,
              fat: item.fat,
              carbs: item.carbs,
              sugar: item.sugar,
              protein: item.protein,
              salt: item.salt,
              fiber: item.fiber,
            };
          }),
        );

        setDate(meal.date);
        setTime(meal.time);
        setItems(draftItems);
      });
    }
  }, [mode, editId]);

  const addItem = (item: DraftItem) => setItems((prev) => [...prev, item]);
  const removeItem = (index: number) =>
    setItems((prev) => prev.filter((_, i) => i !== index));
  const updateItem = (index: number, partial: Partial<DraftItem>) =>
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...partial } : item)),
    );

  const handleSelectIngredient = (ing: Ingredient) => {
    addItem({
      ingredientId: ing.id,
      name: ing.name,
      amount: ing.defaultServing || 100,
      baseAmount: ing.defaultServing || 100,
      unit: ing.unit,
      calories: ing.calories,
      fat: ing.fat,
      carbs: ing.carbs,
      sugar: ing.sugar,
      protein: ing.protein,
      salt: ing.salt,
      fiber: ing.fiber,
    });
  };

  const handleSelectRecipe = async (recipe: Recipe) => {
    const recipeItems = await db.recipeIngredients
      .where("recipeId")
      .equals(recipe.id)
      .toArray();

    const newItems: DraftItem[] = [];
    for (const ri of recipeItems) {
      const ing = await db.ingredients.get(ri.ingredientId);
      if (!ing) continue;

      const baseAmount = ri.amount / Math.max(1, recipe.servings);
      newItems.push({
        ingredientId: ing.id,
        name: ing.name,
        amount: baseAmount,
        baseAmount,
        unit: ing.unit,
        calories: ing.calories,
        fat: ing.fat,
        carbs: ing.carbs,
        sugar: ing.sugar,
        protein: ing.protein,
        salt: ing.salt,
        fiber: ing.fiber,
        fromRecipe: true,
      });
    }

    // Replace any previous recipe items, keep loose ingredients
    setItems((prev) => [
      ...prev.filter((item) => !item.fromRecipe),
      ...newItems,
    ]);
    setSelectedRecipeName(recipe.name);
    setRecipePortions(1);
    setSearchTerm(recipe.name);
    setIsRecipeSearchFocused(false);
  };

  const handleClearRecipe = () => {
    setItems((prev) => prev.filter((item) => !item.fromRecipe));
    setSelectedRecipeName(null);
    setRecipePortions(1);
    setSearchTerm("");
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
        // Auto-create ingredient in DB
        const id = await db.ingredients.add({
          barcode: code,
          name: product.name || "Gescanntes Produkt",
          unit: product.unit,
          calories: product.calories,
          fat: product.fat,
          carbs: product.carbs,
          sugar: product.sugar,
          protein: product.protein,
          salt: product.salt,
          fiber: product.fiber,
          defaultServing: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        const newIng = await db.ingredients.get(id);
        if (newIng) handleSelectIngredient(newIng);
        return;
      }
    }

    alert("Produkt nicht gefunden (oder offline).");
  };

  const handleSave = async () => {
    if (items.length === 0) return;

    try {
      // Build meal name (only used on create)
      let mealName: string | undefined;
      if (mode === "create") {
        if (selectedRecipeName) {
          const parts: string[] = [];
          parts.push(
            recipePortions === 1
              ? selectedRecipeName
              : `${recipePortions} Portionen ${selectedRecipeName}`,
          );
          const hasLooseItems = items.some((item) => !item.fromRecipe);
          if (hasLooseItems) parts.push("Weitere Zutaten");
          mealName = parts.join(", ");
        } else {
          const ingredientNames = Array.from(
            new Set(items.map((item) => item.name).filter(Boolean)),
          );
          mealName =
            ingredientNames.length > 0
              ? ingredientNames.join(", ")
              : "Mahlzeit";
        }
      }

      let currentMealId = editId;

      if (mode === "edit" && editId) {
        await db.meals.update(editId, {
          date,
          time,
          updatedAt: new Date(),
        });
        const oldItems = await db.mealIngredients
          .where("mealId")
          .equals(editId)
          .toArray();
        await db.mealIngredients.bulkDelete(oldItems.map((i) => i.id));
      } else {
        currentMealId = await db.meals.add({
          date,
          time,
          name: mealName!,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      await db.mealIngredients.bulkAdd(
        items.map((item) => ({
          mealId: currentMealId!,
          ingredientId: item.ingredientId,
          amount: item.amount,
          unit: item.unit,
          calories: item.calories,
          fat: item.fat,
          carbs: item.carbs,
          sugar: item.sugar,
          protein: item.protein,
          salt: item.salt,
          fiber: item.fiber,
        })),
      );

      navigateBack();
    } catch (error) {
      console.error("Failed to save meal", error);
    }
  };

  const handleDelete = async () => {
    if (mode !== "edit" || !editId) return;

    try {
      const mealItems = await db.mealIngredients
        .where("mealId")
        .equals(editId)
        .toArray();
      await db.mealIngredients.bulkDelete(mealItems.map((item) => item.id));
      await db.meals.delete(editId);

      setConfirmDeleteOpen(false);
      navigateBack();
    } catch (error) {
      console.error("Failed to delete meal", error);
    }
  };

  const handlePortionChange = (portions: number) => {
    setRecipePortions(portions);
    setItems((prev) =>
      prev.map((item) => {
        if (item.fromRecipe) {
          return { ...item, amount: item.baseAmount * portions };
        }
        return item;
      }),
    );
  };

  const renderList = useMemo(() => {
    const result: Array<
      | { type: "header"; label: string; isRecipe: boolean; key: string }
      | { type: "item"; item: DraftItem; index: number; key: string }
    > = [];

    const recipeItems = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.fromRecipe);
    const looseItems = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !item.fromRecipe);

    if (recipeItems.length > 0 && selectedRecipeName) {
      result.push({
        type: "header",
        label: selectedRecipeName,
        isRecipe: true,
        key: "header-recipe",
      });
      for (const { item, index } of recipeItems) {
        result.push({ type: "item", item, index, key: `item-${index}` });
      }
    }

    if (looseItems.length > 0) {
      result.push({
        type: "header",
        label: "Weitere Zutaten",
        isRecipe: false,
        key: "header-loose",
      });
      for (const { item, index } of looseItems) {
        result.push({ type: "item", item, index, key: `item-${index}` });
      }
    }

    return result;
  }, [items, selectedRecipeName]);

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const factor = item.amount / 100;
        return {
          calories: acc.calories + item.calories * factor,
          fat: acc.fat + item.fat * factor,
          carbs: acc.carbs + item.carbs * factor,
          sugar: acc.sugar + item.sugar * factor,
          protein: acc.protein + item.protein * factor,
          salt: acc.salt + item.salt * factor,
          fiber: acc.fiber + item.fiber * factor,
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
    <>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={navigateBack}>
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
          onChange={(e) => setDate(e.target.value)}
          className="h-9 text-sm flex-1"
        />
        <Input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="h-9 text-sm flex-1"
        />
      </div>

      <div className="relative">
        <Input
          ref={recipeSearchRef}
          type="search"
          placeholder="Rezept suchen..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (selectedRecipeName) {
              // User is editing the field after a selection — clear the recipe
              handleClearRecipe();
            }
          }}
          onFocus={() => {
            setIsRecipeSearchFocused(true);
            // If showing a selected recipe name, select all text so typing replaces it
            if (selectedRecipeName) {
              recipeSearchRef.current?.select();
            }
          }}
          onBlur={() => setTimeout(() => setIsRecipeSearchFocused(false), 200)}
          className="pr-9"
        />

        {searchTerm ? (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClearRecipe}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Suche zurücksetzen">
            <X className="h-4 w-4" />
          </button>
        ) : null}

        {isRecipeSearchFocused && !selectedRecipeName ? (
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
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
        {renderList.map((entry) => {
          if (entry.type === "header") {
            return (
              <div
                key={entry.key}
                className="flex items-center justify-between pt-2 first:pt-0">
                <span className="text-sm font-semibold text-muted-foreground">
                  {entry.label}
                </span>
                {entry.isRecipe && (
                  <select
                    value={recipePortions}
                    onChange={(e) =>
                      handlePortionChange(Number(e.target.value))
                    }
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? "Portion" : "Portionen"}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          }

          const { item, index } = entry;
          return (
            <div
              key={entry.key}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card/50">
              <div className="flex-1 overflow-hidden">
                <div className="font-medium text-sm truncate">{item.name}</div>
                <div className="text-xs text-muted-foreground">
                  {Math.round(item.calories)} kcal / 100{item.unit}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-24">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={item.amount ? Math.round(item.amount) : ""}
                    onChange={(e) =>
                      updateItem(index, {
                        amount: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="h-8 pr-8 text-right bg-background"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                    {item.unit}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  onClick={() => removeItem(index)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
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
            F
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
              onClick={handleSave}
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
            <Button variant="destructive" onClick={handleDelete}>
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
