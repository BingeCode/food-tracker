import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/lib/db";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { NutritionInputFields } from "@/components/NutritionInputFields";
import { fetchProductByBarcode } from "@/lib/openfoodfacts";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Scan, RotateCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useViewTransitionNavigate } from "@/hooks/useViewTransitionNavigate";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function IngredientsPage() {
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("id")
    ? Number(searchParams.get("id"))
    : undefined;
  const mode = editId ? "edit" : "create";

  const [barcode, setBarcode] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<"g" | "ml">("g");
  const [calories, setCalories] = useState(0);
  const [fat, setFat] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [sugar, setSugar] = useState(0);
  const [protein, setProtein] = useState(0);
  const [salt, setSalt] = useState(0);
  const [fiber, setFiber] = useState(0);
  const [defaultServing, setDefaultServing] = useState(100);

  const isOnline = useOnlineStatus();
  const { navigateBack } = useViewTransitionNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Load ingredient data if editing
  useEffect(() => {
    if (mode === "edit" && editId) {
      db.ingredients.get(editId).then((ingredient) => {
        if (!ingredient) return;
        setBarcode(ingredient.barcode ?? "");
        setName(ingredient.name);
        setUnit(ingredient.unit);
        setCalories(ingredient.calories);
        setFat(ingredient.fat);
        setCarbs(ingredient.carbs);
        setSugar(ingredient.sugar);
        setProtein(ingredient.protein);
        setSalt(ingredient.salt);
        setFiber(ingredient.fiber);
        setDefaultServing(ingredient.defaultServing);
      });
    }
  }, [mode, editId]);

  const nutritionValues = { calories, fat, carbs, sugar, protein, salt, fiber };

  const setNutritionField = (field: string, value: number) => {
    const setters: Record<string, (v: number) => void> = {
      calories: setCalories,
      fat: setFat,
      carbs: setCarbs,
      sugar: setSugar,
      protein: setProtein,
      salt: setSalt,
      fiber: setFiber,
    };
    setters[field]?.(value);
  };

  const handleScan = async (code: string) => {
    setIsScanning(false);
    setBarcode(code);
    await loadApiData(code);
  };

  const loadApiData = async (code: string) => {
    if (!isOnline || !code) return;
    setIsLoading(true);
    try {
      const result = await fetchProductByBarcode(code);
      if (result.found) {
        setName(result.name || name);
        setUnit(result.unit);
        setCalories(result.calories);
        setFat(result.fat);
        setCarbs(result.carbs);
        setSugar(result.sugar);
        setProtein(result.protein);
        setSalt(result.salt);
        setFiber(result.fiber);
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
        barcode: barcode || undefined,
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
    } else if (mode === "edit" && editId) {
      await db.ingredients.update(editId, {
        barcode: barcode || undefined,
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

      // Propagate nutrition changes to all referencing meal ingredients
      const refs = await db.mealIngredients
        .where("ingredientId")
        .equals(editId)
        .toArray();

      if (refs.length > 0) {
        await Promise.all(
          refs.map((item) =>
            db.mealIngredients.update(item.id, {
              unit,
              calories,
              fat,
              carbs,
              sugar,
              protein,
              salt,
              fiber,
            }),
          ),
        );
      }
    }

    navigateBack();
  };

  const onDelete = async () => {
    if (mode !== "edit" || !editId) return;

    try {
      const recipeItems = await db.recipeIngredients
        .where("ingredientId")
        .equals(editId)
        .toArray();
      const mealItems = await db.mealIngredients
        .where("ingredientId")
        .equals(editId)
        .toArray();

      await db.recipeIngredients.bulkDelete(recipeItems.map((item) => item.id));
      await db.mealIngredients.bulkDelete(mealItems.map((item) => item.id));
      await db.ingredients.delete(editId);

      setConfirmDeleteOpen(false);
      navigateBack();
    } catch (error) {
      console.error("Failed to delete ingredient", error);
    }
  };

  return (
    <>
      <div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={navigateBack}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Zurück</span>
          </Button>
          <h2 className="text-foreground font-semibold">
            {mode === "create" ? "Zutat hinzufügen" : "Zutat bearbeiten"}
          </h2>
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="barcode">Barcode</Label>
          <div className="flex gap-2">
            <Input
              id="barcode"
              inputMode="numeric"
              placeholder="Scan oder manuell"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
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

        <div className="flex flex-col gap-1">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            placeholder="z.B. Haferflocken"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label>Einheit</Label>
          <div className="flex rounded-md shadow-sm border p-1 bg-muted/20 w-full">
            <button
              type="button"
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-sm transition-all, flex-1",
                unit === "g"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setUnit("g")}>
              Gramm (g)
            </button>
            <button
              type="button"
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-sm transition-all, flex-1",
                unit === "ml"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setUnit("ml")}>
              Milliliter (ml)
            </button>
          </div>
        </div>

        <NutritionInputFields
          values={nutritionValues}
          onChange={setNutritionField}
          className="mt-6"
        />

        {/* Serving Size */}
        <div className="flex flex-col gap-1 mt-auto">
          <Label htmlFor="serving">Standardportion</Label>
          <div className="relative w-1/2">
            <Input
              id="serving"
              type="number"
              inputMode="tel"
              value={defaultServing || ""}
              onChange={(e) =>
                setDefaultServing(parseFloat(e.target.value) || 0)
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
          {mode === "edit" && editId ? (
            <Button
              variant="destructive"
              size="icon"
              className="shrink-0"
              onClick={() => setConfirmDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Zutat löschen</span>
            </Button>
          ) : null}
          <Button className="flex-1" onClick={onSave} disabled={!name.trim()}>
            Speichern
          </Button>
        </div>
      </div>

      <BarcodeScanner
        open={isScanning}
        onScan={handleScan}
        onClose={() => setIsScanning(false)}
      />

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zutat löschen?</DialogTitle>
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
            <Button variant="destructive" onClick={onDelete}>
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
