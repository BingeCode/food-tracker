import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppFooter } from "@/components/AppFooter";
import { LogPage } from "@/pages/LogPage";
import { RecipesIngredientsPage } from "@/pages/RecipesIngredientsPage";
import { Drawer } from "@/components/ui/drawer";
import { useDrawerStore } from "@/stores/drawer-store";
import { MealDrawerContent } from "@/components/drawers/MealDrawerContent";
import { RecipeDrawerContent } from "@/components/drawers/RecipeDrawerContent";
import { IngredientDrawerContent } from "@/components/drawers/IngredientDrawerContent";
import { GoalsDrawerContent } from "@/components/drawers/GoalsDrawerContent";

function App() {
  const {
    mealDraft,
    closeMealDrawer,
    recipeDraft,
    closeRecipeDrawer,
    ingredientDraft,
    closeIngredientDrawer,
    goalsDraft,
    closeGoalsDrawer,
  } = useDrawerStore();

  return (
    <HashRouter>
      <div className="h-dvh w-full flex flex-col overflow-hidden bg-background text-foreground antialiased font-sans">
        <main className="flex-1 overflow-hidden relative">
          <Routes>
            <Route path="/" element={<Navigate to="/log" replace />} />
            <Route path="/log" element={<LogPage />} />
            <Route path="/recipes" element={<RecipesIngredientsPage />} />
            <Route path="*" element={<Navigate to="/log" replace />} />
          </Routes>
        </main>

        <AppFooter />

        {/* Drawers */}
        <Drawer
          open={mealDraft.open}
          onOpenChange={(o) => !o && closeMealDrawer()}>
          <MealDrawerContent />
        </Drawer>

        <Drawer
          open={recipeDraft.open}
          onOpenChange={(o) => !o && closeRecipeDrawer()}>
          <RecipeDrawerContent />
        </Drawer>

        <Drawer
          open={ingredientDraft.open}
          onOpenChange={(o) => !o && closeIngredientDrawer()}>
          <IngredientDrawerContent />
        </Drawer>

        <Drawer
          open={goalsDraft.open}
          onOpenChange={(o) => !o && closeGoalsDrawer()}>
          <GoalsDrawerContent />
        </Drawer>
      </div>
    </HashRouter>
  );
}

export default App;
