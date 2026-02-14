import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useIngredients } from "@/hooks/useMeals";
import { cn } from "@/lib/utils";
import type { Ingredient } from "@/types";

interface IngredientSearchProps {
  onSelect: (ingredient: Ingredient) => void;
  className?: string;
}

export function IngredientSearch({
  onSelect,
  className,
}: IngredientSearchProps) {
  const [term, setTerm] = useState("");
  // We only run query if term length > 1 for performance
  const query = term.length > 1 ? term : undefined;
  const ingredients = useIngredients(query);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      className={cn(
        "bg-background transition-all duration-300 w-full",
        isFocused ? "sticky bottom-0 pb-2 z-30" : "",
        className,
      )}>
      {/* Results overlay - only show when focused and has search term */}
      {isFocused && term.length > 1 && ingredients && (
        <div className="absolute bottom-full left-0 right-0 max-h-60 overflow-y-auto bg-background/95 backdrop-blur border rounded-t-lg shadow-lg mb-2 z-50 supports-[backdrop-filter]:bg-background/90">
          {ingredients.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              Keine Zutaten gefunden
            </div>
          ) : (
            <div className="divide-y">
              {ingredients.map((ing) => (
                <button
                  key={ing.id}
                  onClick={() => {
                    onSelect(ing);
                    setTerm("");
                    // Keep focus? Maybe not, context switch is better
                  }}
                  className="w-full text-left p-3 hover:bg-muted/50 transition-colors">
                  <div className="font-medium text-sm">{ing.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {Math.round(ing.calories)} kcal / 100{ing.unit}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Weitere Zutat hinzufügen..."
          className="pl-9"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Delay blur to allow click on result
            setTimeout(() => setIsFocused(false), 200);
          }}
        />
      </div>
    </div>
  );
}
