import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AppFooter } from "@/components/AppFooter";
import { LogPage } from "@/pages/LogPage";
import { RecipesIngredientsPage } from "@/pages/RecipesIngredientsPage";
import { MealDrawerContent } from "@/components/drawers/MealDrawerContent";
import { RecipeDrawerContent } from "./components/drawers/RecipeDrawerContent";
import { IngredientDrawerContent } from "@/components/drawers/IngredientDrawerContent";
import { GoalsDrawerContent } from "@/components/drawers/GoalsDrawerContent";

function AppShell() {
  const location = useLocation();
  const isEditorPage = ["/meal", "/recipe", "/ingredient", "/goals"].includes(
    location.pathname,
  );

  return (
    <div className="h-dvh w-full flex flex-col overflow-hidden bg-background text-foreground antialiased font-sans">
      <main
        className={`relative p-4 flex-1 min-h-0 flex flex-col gap-3 ${
          isEditorPage ? "pb-0" : "pb-20"
        }`}>
        <Routes>
          <Route path="/" element={<Navigate to="/log" replace />} />
          <Route path="/log" element={<LogPage />} />
          <Route path="/recipes" element={<RecipesIngredientsPage />} />
          <Route path="/meal" element={<MealDrawerContent />} />
          <Route path="/recipe" element={<RecipeDrawerContent />} />
          <Route path="/ingredient" element={<IngredientDrawerContent />} />
          <Route path="/goals" element={<GoalsDrawerContent />} />
          <Route path="*" element={<Navigate to="/log" replace />} />
        </Routes>
      </main>

      {!isEditorPage && <AppFooter />}
    </div>
  );
}

function App() {
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  );
}

export default App;
