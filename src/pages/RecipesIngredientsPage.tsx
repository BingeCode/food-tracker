import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useRecipes, useIngredients } from "@/hooks/useMeals";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, ChefHat, Carrot, Edit2, X } from "lucide-react";
import { useViewTransitionNavigate } from "@/hooks/useViewTransitionNavigate";

export function RecipesIngredientsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab =
    searchParams.get("tab") === "ingredients" ? "ingredients" : "recipes";
  const [searchTerm, setSearchTerm] = useState("");

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab }, { replace: true });
  };

  const recipes = useRecipes(activeTab === "recipes" ? searchTerm : undefined);
  const ingredients = useIngredients(
    activeTab === "ingredients" ? searchTerm : undefined,
  );

  const { navigateTo } = useViewTransitionNavigate();

  return (
    <div className="h-full flex flex-col min-h-0 gap-3">
      <h1 className="text-xl font-bold">Bibliothek</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="recipes" className="gap-2">
            <ChefHat className="h-4 w-4" /> Rezepte
          </TabsTrigger>
          <TabsTrigger value="ingredients" className="gap-2">
            <Carrot className="h-4 w-4" /> Zutaten
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder={
            activeTab === "recipes" ? "Rezepte suchen..." : "Zutaten suchen..."
          }
          className="pl-9 pr-9 bg-background"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm ? (
          <button
            type="button"
            onClick={() => setSearchTerm("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Suche zurücksetzen">
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {activeTab === "recipes" && (
        <Button
          variant="outline"
          className="w-full h-auto py-3 justify-start"
          onClick={() => navigateTo("/recipe")}>
          <Plus className="h-4 w-4" />
          Rezept hinzufügen
        </Button>
      )}

      {activeTab === "ingredients" && (
        <Button
          variant="outline"
          className="w-full h-auto py-3 justify-start"
          onClick={() => navigateTo("/ingredient")}>
          <Plus className="h-4 w-4" />
          Zutat hinzufügen
        </Button>
      )}

      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto gap-2">
        {activeTab === "recipes" &&
          recipes?.map((recipe) => (
            <div
              key={recipe.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card shadow-sm"
              onClick={() => navigateTo(`/recipe?id=${recipe.id}`)}>
              <div>
                <div className="font-semibold">{recipe.name}</div>
                <div className="text-sm text-muted-foreground">
                  {recipe.servings}{" "}
                  {recipe.servings === 1 ? "Portion" : "Portionen"}
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <Edit2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}

        {activeTab === "ingredients" &&
          ingredients?.map((ing) => (
            <div
              key={ing.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card shadow-sm"
              onClick={() => navigateTo(`/ingredient?id=${ing.id}`)}>
              <div>
                <div className="font-semibold">{ing.name}</div>
                <div className="text-sm text-muted-foreground">
                  {Math.round(ing.calories)} kcal / 100{ing.unit}
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
