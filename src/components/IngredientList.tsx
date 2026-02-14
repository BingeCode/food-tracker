import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface IngredientListProps {
  items: Array<{
    name: string;
    amount: number;
    unit: "g" | "ml";
  }>;
  onRemove: (index: number) => void;
  onUpdateAmount: (index: number, amount: number) => void;
  readOnly?: boolean;
}

export function IngredientList({
  items,
  onRemove,
  onUpdateAmount,
  readOnly = false,
}: IngredientListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-lg">
        Keine Zutaten hinzugefügt
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={index}
          className="flex items-center gap-2 p-2 rounded-md border bg-card">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{item.name}</div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!readOnly && (
              <div className="relative w-20">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={item.amount || ""}
                  onChange={(e) =>
                    onUpdateAmount(index, parseFloat(e.target.value) || 0)
                  }
                  className="h-8 pr-7 text-right tabular-nums"
                  min={0}
                />
                <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                  <span className="text-muted-foreground text-xs">
                    {item.unit}
                  </span>
                </div>
              </div>
            )}

            {readOnly && (
              <span className="text-sm font-medium tabular-nums">
                {item.amount}
                {item.unit}
              </span>
            )}

            {!readOnly && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(index)}>
                <X className="h-4 w-4" />
                <span className="sr-only">Entfernen</span>
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
