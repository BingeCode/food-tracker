import { useState } from "react";
import { useRecipes, useIngredients } from "@/hooks/useMeals";
import { useDrawerStore } from "@/stores/drawer-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, ChefHat, Carrot, Edit2 } from "lucide-react";
import { useViewTransitionNavigate } from "@/hooks/useViewTransitionNavigate";

export function RecipesIngredientsPage() {
  const [activeTab, setActiveTab] = useState("recipes");
  const [searchTerm, setSearchTerm] = useState("");

  const recipes = useRecipes(activeTab === "recipes" ? searchTerm : undefined);
  const ingredients = useIngredients(
    activeTab === "ingredients" ? searchTerm : undefined,
  );

  const { openRecipeDrawer, openIngredientDrawer } = useDrawerStore();
  const { navigateTo } = useViewTransitionNavigate();

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      <div className="p-4 bg-muted/30 pb-2">
        <h1 className="text-xl font-bold mb-4">Bibliothek</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-2">
            <TabsTrigger value="recipes" className="gap-2">
              <ChefHat className="h-4 w-4" /> Rezepte
            </TabsTrigger>
            <TabsTrigger value="ingredients" className="gap-2">
              <Carrot className="h-4 w-4" /> Zutaten
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={
              activeTab === "recipes"
                ? "Rezepte suchen..."
                : "Zutaten suchen..."
            }
            className="pl-9 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-20">
        {activeTab === "recipes" && (
          <div className="space-y-3">
            {recipes?.map((recipe) => (
              <div
                key={recipe.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card shadow-sm"
                onClick={() => {
                  openRecipeDrawer("edit", recipe.id);
                  navigateTo("/recipe");
                }}>
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
            {recipes?.length === 0 && (
              <div className="text-center py-10 text-muted-foreground text-sm">
                Keine Rezepte gefunden.
              </div>
            )}
          </div>
        )}

        {activeTab === "ingredients" && (
          <div className="space-y-3">
            {ingredients?.map((ing) => (
              <div
                key={ing.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card shadow-sm"
                onClick={() => {
                  openIngredientDrawer("edit", ing.id);
                  navigateTo("/ingredient");
                }}>
                <div>
                  <div className="font-semibold">{ing.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {Math.round(ing.calories)} kcal / 100{ing.unit}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground text-right">
                  {ing.barcode ? "Scanbar" : "Manuell"}
                </div>
              </div>
            ))}
            {ingredients?.length === 0 && (
              <div className="text-center py-10 text-muted-foreground text-sm">
                Keine Zutaten gefunden.
              </div>
            )}
          </div>
        )}
      </div>

      {/* FAB */}
      <div className="absolute right-6 bottom-24 z-40">
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
          onClick={() => {
            if (activeTab === "recipes") {
              openRecipeDrawer("create");
              navigateTo("/recipe");
              return;
            }

            openIngredientDrawer("create");
            navigateTo("/ingredient");
          }}>
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
