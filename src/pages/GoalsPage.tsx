import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/lib/db";
import { useEffect, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { useViewTransitionNavigate } from "@/hooks/useViewTransitionNavigate";

export function GoalsPage() {
  const { navigateBack } = useViewTransitionNavigate();

  const [calories, setCalories] = useState(2700);
  const [fatPct, setFatPct] = useState(30);
  const [carbsPct, setCarbsPct] = useState(45);
  const [proteinPct, setProteinPct] = useState(25);
  const [sugar, setSugar] = useState(50);
  const [salt, setSalt] = useState(6);
  const [fiber, setFiber] = useState(30);

  useEffect(() => {
    let cancelled = false;

    async function loadGoals() {
      const goals = await db.dailyGoals.orderBy("id").first();
      if (!goals || cancelled) return;
      setCalories(goals.calories);
      setFatPct(goals.fatPct);
      setCarbsPct(goals.carbsPct);
      setProteinPct(goals.proteinPct);
      setSugar(goals.sugar);
      setSalt(goals.salt);
      setFiber(goals.fiber);
    }

    loadGoals();
    return () => {
      cancelled = true;
    };
  }, []);

  // Compute gram values from percentages for display
  const fatGrams = Math.round((calories * fatPct) / 100 / 9);
  const carbsGrams = Math.round((calories * carbsPct) / 100 / 4);
  const proteinGrams = Math.round((calories * proteinPct) / 100 / 4);
  const pctTotal = fatPct + carbsPct + proteinPct;

  const handleSave = async () => {
    try {
      const first = await db.dailyGoals.orderBy("id").first();
      const data = {
        calories,
        fatPct,
        carbsPct,
        proteinPct,
        sugar,
        salt,
        fiber,
      };
      if (first) {
        await db.dailyGoals.update(first.id, data);
      } else {
        await db.dailyGoals.add(data);
      }
      navigateBack();
    } catch (e) {
      console.error("Failed to save goals", e);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={navigateBack}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Zurück</span>
        </Button>
        <h2 className="text-foreground font-semibold">Tagesziele</h2>
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

        {/* Macro percentages */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Makroverteilung</Label>
            <span
              className={`text-xs tabular-nums ${pctTotal === 100 ? "text-muted-foreground" : "text-destructive font-semibold"}`}>
              {pctTotal}%
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Fett (%)</Label>
              <Input
                type="number"
                inputMode="tel"
                value={fatPct}
                onChange={(e) => setFatPct(parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground tabular-nums">
                = {fatGrams}g
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Kohlenhydrate (%)</Label>
              <Input
                type="number"
                inputMode="tel"
                value={carbsPct}
                onChange={(e) => setCarbsPct(parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground tabular-nums">
                = {carbsGrams}g
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Eiweiß (%)</Label>
              <Input
                type="number"
                inputMode="tel"
                value={proteinPct}
                onChange={(e) => setProteinPct(parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground tabular-nums">
                = {proteinGrams}g
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
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
