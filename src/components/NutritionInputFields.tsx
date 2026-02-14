import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface NutritionInputFieldsProps {
  values: {
    calories: number;
    fat: number;
    carbs: number;
    sugar: number;
    protein: number;
    salt: number;
    fiber: number;
  };
  onChange: (field: string, value: number) => void;
  className?: string;
}

export function NutritionInputFields({
  values,
  onChange,
  className,
}: NutritionInputFieldsProps) {
  const fields = [
    { key: "calories", label: "Kalorien", unit: "kcal", step: 1 },
    { key: "fat", label: "Fett", unit: "g", step: 0.1 },
    { key: "carbs", label: "Kohlenhydrate", unit: "g", step: 0.1 },
    { key: "sugar", label: "Zucker", unit: "g", step: 0.1 },
    { key: "protein", label: "Eiweiß", unit: "g", step: 0.1 },
    { key: "salt", label: "Salz", unit: "g", step: 0.01 },
    { key: "fiber", label: "Ballaststoffe", unit: "g", step: 0.1 },
  ] as const;

  return (
    <div className={cn("grid grid-cols-2 gap-4", className)}>
      {fields.map(({ key, label, unit, step }) => (
        <div
          key={key}
          className={cn("relative", key === "calories" && "col-span-2")}>
          <Label htmlFor={`nutri-${key}`} className="sr-only">
            {label}
          </Label>
          <div className="relative">
            <Input
              id={`nutri-${key}`}
              type="number"
              inputMode="decimal"
              step={step}
              placeholder={label}
              value={values[key] || ""}
              onChange={(e) => onChange(key, parseFloat(e.target.value) || 0)}
              className="pr-12 tabular-nums"
              min={0}
            />
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <span className="text-muted-foreground text-xs font-medium">
                {unit}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
