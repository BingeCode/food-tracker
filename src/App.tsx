import { HashRouter, Routes, Route, Navigate } from "react-router-dom";

function LogPage() {
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted-foreground">Log Page — To be implemented</p>
    </div>
  );
}

function RecipesIngredientsPage() {
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted-foreground">
        Recipes / Ingredients — To be implemented
      </p>
    </div>
  );
}

function App() {
  return (
    <HashRouter>
      <div className="flex flex-col h-dvh max-w-md mx-auto">
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<LogPage />} />
            <Route path="/recipes" element={<RecipesIngredientsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        {/* Footer will go here */}
      </div>
    </HashRouter>
  );
}

export default App;
