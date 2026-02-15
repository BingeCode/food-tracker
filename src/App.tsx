import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AppFooter } from "@/components/AppFooter";
import { LogsPage } from "@/pages/LogsPage";
import { RecipesIngredientsPage } from "@/pages/RecipesIngredientsPage";
import { MealsPage } from "@/pages/MealsPage";
import { RecipesPage } from "./pages/RecipesPage";
import { IngredientsPage } from "@/pages/IngredientsPage";
import { GoalsPage } from "@/pages/GoalsPage";

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
          <Route path="/log" element={<LogsPage />} />
          <Route path="/recipes" element={<RecipesIngredientsPage />} />
          <Route path="/meal" element={<MealsPage />} />
          <Route path="/recipe" element={<RecipesPage />} />
          <Route path="/ingredient" element={<IngredientsPage />} />
          <Route path="/goals" element={<GoalsPage />} />
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
