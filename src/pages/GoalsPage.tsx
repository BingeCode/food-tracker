import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/lib/db";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useViewTransitionNavigate } from "@/hooks/useViewTransitionNavigate";

export function GoalsPage() {
  const [searchParams] = useSearchParams();
  const overrideDate = searchParams.get("date") || undefined;
  const { navigateBack } = useViewTransitionNavigate();

  const [calories, setCalories] = useState(2700);
  const [fat, setFat] = useState(90);
  const [carbs, setCarbs] = useState(304);
  const [protein, setProtein] = useState(169);
  const [sugar, setSugar] = useState(50);
  const [salt, setSalt] = useState(6);
  const [fiber, setFiber] = useState(30);

  useEffect(() => {
    let cancelled = false;

    async function loadGoals() {
      const defaults = await db.dailyGoals.orderBy("id").first();
      const current = {
        calories: defaults?.calories ?? 2700,
        fat: defaults?.fat ?? 90,
        carbs: defaults?.carbs ?? 304,
        protein: defaults?.protein ?? 169,
        sugar: defaults?.sugar ?? 50,
        salt: defaults?.salt ?? 6,
        fiber: defaults?.fiber ?? 30,
      };

      if (overrideDate) {
        const override = await db.dailyGoalOverrides
          .where("date")
          .equals(overrideDate)
          .first();
        if (override) {
          if (override.calories) current.calories = override.calories;
          if (override.fat) current.fat = override.fat;
          if (override.carbs) current.carbs = override.carbs;
          if (override.protein) current.protein = override.protein;
          if (override.sugar) current.sugar = override.sugar;
          if (override.salt) current.salt = override.salt;
          if (override.fiber) current.fiber = override.fiber;
        }
      }

      if (cancelled) return;
      setCalories(current.calories);
      setFat(current.fat);
      setCarbs(current.carbs);
      setProtein(current.protein);
      setSugar(current.sugar);
      setSalt(current.salt);
      setFiber(current.fiber);
    }

    loadGoals();
    return () => { cancelled = true; };
  }, [overrideDate]);

  const handleSave = async () => {
    try {
      if (overrideDate) {
        const existing = await db.dailyGoalOverrides
          .where("date")
          .equals(overrideDate)
          .first();
        if (existing) {
          await db.dailyGoalOverrides.update(existing.id, {
            calories,
            fat,
            carbs,
            protein,
            sugar,
            salt,
            fiber,
          });
        } else {
          await db.dailyGoalOverrides.add({
            date: overrideDate,
            calories,
            fat,
            carbs,
            protein,
            sugar,
            salt,
            fiber,
          });
        }
      } else {
        const first = await db.dailyGoals.orderBy("id").first();
        if (first) {
          await db.dailyGoals.update(first.id, {
            calories,
            fat,
            carbs,
            protein,
            sugar,
            salt,
            fiber,
          });
        } else {
          await db.dailyGoals.add({
            calories,
            fat,
            carbs,
            protein,
            sugar,
            salt,
            fiber,
          });
        }
      }
      navigateBack();
    } catch (e) {
      console.error("Failed to save goals", e);
    }
  };

  const title = overrideDate
    ? `Ziele für ${format(new Date(overrideDate), "dd.MM.yyyy", { locale: de })}`
    : "Standard-Tagesziele";

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={navigateBack}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Zurück</span>
        </Button>
        <h2 className="text-foreground font-semibold">{title}</h2>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
        <div className="space-y-1">
          <Label>Kalorien (kcal)</Label>
          <Input
            type="number"
            inputMode="tel"
            value={calories}
            onChange={(e) => setCalories(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Fett (g)</Label>
            <Input
              type="number"
              inputMode="tel"
              value={fat}
              onChange={(e) => setFat(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1">
            <Label>Kohlenhydrate (g)</Label>
            <Input
              type="number"
              inputMode="tel"
              value={carbs}
              onChange={(e) => setCarbs(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1">
            <Label>Eiweiß (g)</Label>
            <Input
              type="number"
              inputMode="tel"
              value={protein}
              onChange={(e) => setProtein(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1">
            <Label>Zucker (g)</Label>
            <Input
              type="number"
              inputMode="tel"
              value={sugar}
              onChange={(e) => setSugar(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1">
            <Label>Salz (g)</Label>
            <Input
              type="number"
              inputMode="tel"
              value={salt}
              onChange={(e) => setSalt(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1">
            <Label>Ballaststoffe (g)</Label>
            <Input
              type="number"
              inputMode="tel"
              value={fiber}
              onChange={(e) => setFiber(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
      </div>

      <div className="flex p-10 pt-6 pb-6 shrink-0">
        <Button className="flex-1 gap-2" onClick={handleSave}>
          <Save className="h-4 w-4" />
          Speichern
        </Button>
      </div>
    </>
  );
}
