import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDrawerStore } from "@/stores/drawer-store";
import { db } from "@/lib/db";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { NutritionInputFields } from "@/components/NutritionInputFields";
import { fetchProductByBarcode } from "@/lib/openfoodfacts";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useEffect, useState } from "react";
import { ArrowLeft, Scan, RotateCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useViewTransitionNavigate } from "@/hooks/useViewTransitionNavigate";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader as ConfirmDialogHeader,
  DialogTitle as ConfirmDialogTitle,
} from "@/components/ui/dialog";

export function IngredientDrawerContent() {
  const {
    ingredientDraft,
    closeIngredientDrawer,
    updateIngredientDraft,
    clearIngredientDraft,
  } = useDrawerStore();
  const isOnline = useOnlineStatus();
  const { navigateBack } = useViewTransitionNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const {
    open,
    mode,
    barcode,
    name,
    unit,
    calories,
    fat,
    carbs,
    sugar,
    protein,
    salt,
    fiber,
    defaultServing,
  } = ingredientDraft;

  useEffect(() => {
    if (open && mode === "edit" && ingredientDraft.editId) {
      db.ingredients.get(ingredientDraft.editId).then((ingredient) => {
        if (!ingredient) return;
        updateIngredientDraft({
          barcode: ingredient.barcode ?? "",
          name: ingredient.name,
          unit: ingredient.unit,
          calories: ingredient.calories,
          fat: ingredient.fat,
          carbs: ingredient.carbs,
          sugar: ingredient.sugar,
          protein: ingredient.protein,
          salt: ingredient.salt,
          fiber: ingredient.fiber,
          defaultServing: ingredient.defaultServing,
        });
      });
    }
  }, [open, mode, ingredientDraft.editId, updateIngredientDraft]);

  const handleScan = async (code: string) => {
    setIsScanning(false);
    updateIngredientDraft({ barcode: code });
    await loadApiData(code);
  };

  const loadApiData = async (code: string) => {
    if (!isOnline || !code) return;
    setIsLoading(true);
    try {
      const result = await fetchProductByBarcode(code);
      if (result.found) {
        updateIngredientDraft({
          name: result.name || name,
          unit: result.unit,
          calories: result.calories,
          fat: result.fat,
          carbs: result.carbs,
          sugar: result.sugar,
          protein: result.protein,
          salt: result.salt,
          fiber: result.fiber,
        });
      }
    } catch (error) {
      console.error("API error", error);
    } finally {
      setIsLoading(false);
    }
  };

  const onManualBarcodeBlur = () => {
    if (barcode && isOnline) {
      loadApiData(barcode);
    }
  };

  const onSave = async () => {
    if (!name.trim()) return;

    if (mode === "create") {
      await db.ingredients.add({
        barcode,
        name,
        unit,
        calories,
        fat,
        carbs,
        sugar,
        protein,
        salt,
        fiber,
        defaultServing,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else if (mode === "edit" && ingredientDraft.editId) {
      await db.ingredients.update(ingredientDraft.editId, {
        barcode,
        name,
        unit,
        calories,
        fat,
        carbs,
        sugar,
        protein,
        salt,
        fiber,
        defaultServing,
        updatedAt: new Date(),
      });
    }

    clearIngredientDraft();
    closeIngredientDrawer();
    navigateBack();
  };

  const onDelete = async () => {
    if (mode !== "edit" || !ingredientDraft.editId) return;

    try {
      const ingredientId = ingredientDraft.editId;
      const recipeItems = await db.recipeIngredients
        .where("ingredientId")
        .equals(ingredientId)
        .toArray();
      const mealItems = await db.mealItems
        .where("ingredientId")
        .equals(ingredientId)
        .toArray();

      await db.recipeIngredients.bulkDelete(
        recipeItems.map((item) => item.id!).filter(Boolean),
      );
      await db.mealItems.bulkDelete(
        mealItems.map((item) => item.id!).filter(Boolean),
      );
      await db.ingredients.delete(ingredientId);

      setConfirmDeleteOpen(false);
      clearIngredientDraft();
      closeIngredientDrawer();
      navigateBack();
    } catch (error) {
      console.error("Failed to delete ingredient", error);
    }
  };

  const handleBack = () => {
    closeIngredientDrawer();
    navigateBack();
  };

  return (
    <>
      <div className="h-full w-full bg-background flex flex-col">
        <div className="mx-auto w-full max-w-md flex flex-col h-full bg-background overflow-hidden">
          <div className="shrink-0 p-4 border-b">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Zurück</span>
              </Button>
              <h2 className="text-foreground font-semibold">
                {mode === "create" ? "Zutat hinzufügen" : "Zutat bearbeiten"}
              </h2>
            </div>
          </div>

          <div className="p-4 overflow-y-auto flex-1 space-y-6">
            {/* Barcode Section */}
            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode</Label>
              <div className="flex gap-2">
                <Input
                  id="barcode"
                  inputMode="numeric"
                  placeholder="Scan oder manuell"
                  value={barcode}
                  onChange={(e) =>
                    updateIngredientDraft({ barcode: e.target.value })
                  }
                  onBlur={onManualBarcodeBlur}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  disabled={!isOnline}
                  onClick={() => setIsScanning(true)}>
                  {isLoading ? (
                    <RotateCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Scan className="h-4 w-4" />
                  )}
                  <span className="sr-only">Scan</span>
                </Button>
              </div>
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="z.B. Haferflocken"
                  value={name}
                  onChange={(e) =>
                    updateIngredientDraft({ name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Einheit</Label>
                <div className="flex rounded-md shadow-sm border p-1 bg-muted/20 w-max">
                  <button
                    type="button"
                    className={cn(
                      "px-4 py-1.5 text-sm font-medium rounded-sm transition-all",
                      unit === "g"
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => updateIngredientDraft({ unit: "g" })}>
                    Gramm (g)
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "px-4 py-1.5 text-sm font-medium rounded-sm transition-all",
                      unit === "ml"
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => updateIngredientDraft({ unit: "ml" })}>
                    Milliliter (ml)
                  </button>
                </div>
              </div>
            </div>

            {/* Nutrition */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">
                Nährwerte pro 100{unit}
              </h4>
              <NutritionInputFields
                values={{ calories, fat, carbs, sugar, protein, salt, fiber }}
                onChange={(key, val) => updateIngredientDraft({ [key]: val })}
              />
            </div>

            {/* Serving Size */}
            <div className="space-y-2 pt-2 mb-6 border-t">
              <Label htmlFor="serving">Standardportion</Label>
              <div className="relative w-1/2">
                <Input
                  id="serving"
                  type="number"
                  inputMode="tel"
                  value={defaultServing || ""}
                  onChange={(e) =>
                    updateIngredientDraft({
                      defaultServing: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="pr-10"
                />
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                  <span className="text-muted-foreground text-xs font-medium">
                    {unit}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-10 pt-6 pb-6">
            <div className="flex gap-2">
              {mode === "edit" && ingredientDraft.editId ? (
                <Button
                  variant="destructive"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setConfirmDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Zutat löschen</span>
                </Button>
              ) : null}
              <Button
                className="flex-1"
                onClick={onSave}
                disabled={!name.trim()}>
                Speichern
              </Button>
            </div>
          </div>
        </div>
      </div>

      <BarcodeScanner
        open={isScanning}
        onScan={handleScan}
        onClose={() => setIsScanning(false)}
      />

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <ConfirmDialogHeader>
            <ConfirmDialogTitle>Zutat löschen?</ConfirmDialogTitle>
            <DialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </ConfirmDialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteOpen(false)}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={onDelete}>
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
