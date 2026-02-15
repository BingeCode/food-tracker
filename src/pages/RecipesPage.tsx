import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IngredientSearch } from "@/components/IngredientSearch";
import { db } from "@/lib/db";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus, Scan, Save, Trash2, X } from "lucide-react";
import type { Ingredient, RecipeIngredient } from "@/types";
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

interface DraftItem {
  ingredientId: number;
  name: string;
  amount: number;
  unit: "g" | "ml";
  defaultServing: number;
  calories: number;
  fat: number;
  carbs: number;
  sugar: number;
  protein: number;
  salt: number;
  fiber: number;
}

export function RecipesPage() {
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("id")
    ? Number(searchParams.get("id"))
    : undefined;
  const mode = editId ? "edit" : "create";

  const [name, setName] = useState("");
  const [servings, setServings] = useState(1);
  const [items, setItems] = useState<DraftItem[]>([]);

  const isOnline = useOnlineStatus();
  const { navigateBack } = useViewTransitionNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Load recipe data if editing
  useEffect(() => {
    if (mode === "edit" && editId) {
      db.recipes.get(editId).then(async (recipe) => {
        if (!recipe) return;
        const dbItems = await db.recipeIngredients
          .where("recipeId")
          .equals(recipe.id)
          .toArray();

        const draftItems: DraftItem[] = [];
        for (const item of dbItems) {
          const ing = await db.ingredients.get(item.ingredientId);
          if (ing) {
            draftItems.push({
              ingredientId: ing.id,
              name: ing.name,
              amount: item.amount,
              unit: ing.unit,
              defaultServing: ing.defaultServing,
              calories: ing.calories,
              fat: ing.fat,
              carbs: ing.carbs,
              sugar: ing.sugar,
              protein: ing.protein,
              salt: ing.salt,
              fiber: ing.fiber,
            });
          }
        }

        setName(recipe.name);
        setServings(recipe.servings);
        setItems(draftItems);
      });
    }
  }, [mode, editId]);

  const addItem = (item: DraftItem) => setItems((prev) => [...prev, item]);
  const removeItem = (index: number) =>
    setItems((prev) => prev.filter((_, i) => i !== index));
  const updateItemAmount = (index: number, amount: number) =>
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, amount } : item)),
    );

  const handleSelectIngredient = (ing: Ingredient) => {
    addItem({
      ingredientId: ing.id,
      name: ing.name,
      amount: ing.defaultServing || 100,
      unit: ing.unit,
      defaultServing: ing.defaultServing,
      calories: ing.calories,
      fat: ing.fat,
      carbs: ing.carbs,
      sugar: ing.sugar,
      protein: ing.protein,
      salt: ing.salt,
      fiber: ing.fiber,
    });
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

    alert("Produkt nicht gefunden.");
  };

  const handleSave = async () => {
    if (!name.trim() || items.length === 0) return;

    try {
      let currentRecipeId = editId;

      if (mode === "edit" && editId) {
        await db.recipes.update(editId, {
          name,
          servings: servings || 1,
          updatedAt: new Date(),
        });
        const oldItems = await db.recipeIngredients
          .where("recipeId")
          .equals(editId)
          .toArray();
        await db.recipeIngredients.bulkDelete(oldItems.map((i) => i.id));
      } else {
        currentRecipeId = await db.recipes.add({
          name,
          servings: servings || 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      const itemsToSave: Omit<RecipeIngredient, "id">[] = items.map((item) => ({
        recipeId: currentRecipeId!,
        ingredientId: item.ingredientId,
        amount: item.amount,
      }));

      await db.recipeIngredients.bulkAdd(itemsToSave);
      navigateBack();
    } catch (error) {
      console.error("Failed to save recipe", error);
    }
  };

  const handleDelete = async () => {
    if (mode !== "edit" || !editId) return;

    try {
      const recipeItems = await db.recipeIngredients
        .where("recipeId")
        .equals(editId)
        .toArray();
      await db.recipeIngredients.bulkDelete(recipeItems.map((item) => item.id));
      await db.recipes.delete(editId);

      setConfirmDeleteOpen(false);
      navigateBack();
    } catch (error) {
      console.error("Failed to delete recipe", error);
    }
  };

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
        <Button variant="ghost" size="icon" onClick={navigateBack}>
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
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="w-20 space-y-1">
          <Label htmlFor="r-servings">Portionen</Label>
          <select
            id="r-servings"
            value={servings}
            onChange={(e) => setServings(parseInt(e.target.value) || 1)}
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
                {Math.round(item.calories)} kcal / 100{item.unit}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() =>
                  updateItemAmount(
                    index,
                    Math.max(0, (item.amount || 0) - item.defaultServing),
                  )
                }>
                <span className="text-base leading-none">-</span>
                <span className="sr-only">Menge verringern</span>
              </Button>

              <div className="relative w-20">
                <Input
                  type="number"
                  inputMode="decimal"
                  value={item.amount || ""}
                  onChange={(e) =>
                    updateItemAmount(index, parseFloat(e.target.value) || 0)
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
                onClick={() =>
                  updateItemAmount(
                    index,
                    (item.amount || 0) + item.defaultServing,
                  )
                }>
                <Plus className="h-4 w-4" />
                <span className="sr-only">Menge erhöhen</span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                onClick={() => removeItem(index)}>
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
              P
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
              F
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
              onClick={handleSave}
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
            <Button variant="destructive" onClick={handleDelete}>
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
