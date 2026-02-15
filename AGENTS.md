# Food Tracker — LLM Agent Context

> German-language PWA for personal daily food & nutrition tracking.
> Private use, single user, no backend — all data in IndexedDB via Dexie.

---

## Tech Stack

| Layer        | Technology                                       |
| ------------ | ------------------------------------------------ |
| Framework    | React 19 + TypeScript 5.9                        |
| Build        | Vite 7 + `@vitejs/plugin-react-swc`              |
| PWA          | `vite-plugin-pwa` (`registerType: "autoUpdate"`) |
| Routing      | `react-router-dom` v7, HashRouter                |
| State        | Local `useState` + `useSearchParams` (no store)  |
| Database     | Dexie 4 (IndexedDB), v3 schema                   |
| Styling      | Tailwind CSS 4 + shadcn/ui + `tw-animate-css`    |
| Icons        | Lucide React                                     |
| Dates        | date-fns (German locale)                         |
| Barcode      | html5-qrcode                                     |
| Product Data | OpenFoodFacts API                                |
| HTTPS (dev)  | `vite-plugin-mkcert`                             |

---

## Project Structure

```
src/
├── App.tsx
├── assets
├── components
│   ├── AppFooter.tsx
│   ├── BarcodeScanner.tsx
│   ├── DateNavigator.tsx
│   ├── IngredientSearch.tsx
│   ├── NutritionInputFields.tsx
│   ├── NutritionSummary.tsx
│   └── ui/
├── hooks
│   ├── useMeals.ts
│   ├── useOnlineStatus.ts
│   └── useViewTransitionNavigate.ts
├── index.css
├── lib
│   ├── db.ts
│   ├── nutrition.ts
│   ├── openfoodfacts.ts
│   └── utils.ts
├── main.tsx
├── pages
│   ├── GoalsPage.tsx
│   ├── IngredientsPage.tsx
│   ├── LogsPage.tsx
│   ├── MealsPage.tsx
│   ├── RecipesIngredientsPage.tsx
│   └── RecipesPage.tsx
└── types
    └── index.ts
```

---

## Data Model

### Core Entities (Dexie tables)

**`ingredients`** — Base food items with per-100g/ml nutrition.
| Field | Type | Notes |
| -------------- | -------------- | ---------------------------- |
| id | number (auto) | Primary key |
| barcode? | string | EAN for OpenFoodFacts lookup |
| name | string | Display name |
| unit | "g" \| "ml" | |
| calories…fiber | number | All per 100 units |
| defaultServing | number | Default amount in g/ml |
| createdAt | Date | |
| updatedAt | Date | Used for sort order |

**`recipes`** — Named collections of ingredients with portion count.
| Field | Type |
| -------- | ------------- |
| id | number (auto) |
| name | string |
| servings | number |

**`recipeIngredients`** — Join table: recipe → ingredient + amount.
| Field | Type |
| ------------ | ------ |
| recipeId | number |
| ingredientId | number |
| amount | number |

**`meals`** — Logged meals tied to a date.
| Field | Type | Notes |
| ----- | ------ | ---------- |
| date | string | YYYY-MM-DD |
| time | string | HH:mm |
| name | string | |

**`mealIngredients`** — Individual items within a meal. Every item **must** reference an ingredient. Stores a **nutrition snapshot** (per-100 values at save time) so historical data remains stable.
| Field | Type | Notes |
| --------------- | ----------- | -------------------------------------- |
| id | number | Primary key |
| mealId | number | FK to meals |
| ingredientId | number | FK to ingredients (required) |
| amount | number | Actual amount in g/ml |
| unit | "g" \| "ml" | |
| calories…fiber | number | Nutrition per 100 units (snapshot) |

> **No name** — display name is derived from the referenced ingredient.
> **No sourceRecipe\*** — recipes are used only to instantiate items; no persistent link.

**`dailyGoals`** — Single row with default nutrition targets.
| Field | Type |
| --------------- | ------ |
| calories | number |
| fat | number |
| carbs | number |
| protein | number |
| sugar | number |
| salt | number |
| fiber | number |

**`dailyGoalOverrides`** — Per-date overrides (unique on `date`).

### Indices (Dexie)

```
ingredients:       ++id, name, barcode, updatedAt
recipes:           ++id, name, updatedAt
recipeIngredients: ++id, recipeId, ingredientId
meals:             ++id, date, createdAt
mealIngredients:   ++id, mealId, ingredientId
dailyGoals:        ++id
dailyGoalOverrides: ++id, &date
```

### Conceptual Relationships

```
Ingredient  ←─┐
               ├── RecipeIngredient ──→ Recipe
               │
               └── MealIngredient ──→ Meal
                   (snapshot of ingredient nutrition at save time)
```

- **Recipe** = template (collection of ingredients with amounts and servings). Used only to instantiate a meal's ingredient list; fully decoupled after that.
- **Meal** = instantiation — items are snapshots, always linked to an ingredient.
- When an **ingredient is updated**, all referencing `mealIngredients` are updated with new unit/nutrition (`IngredientsPage.onSave`).
- When an **ingredient is deleted**, its `mealIngredients` and `recipeIngredients` are cascade-deleted.

### DB Migrations

- **v1 → v2**: Populates per-100 nutrition snapshots on old `mealItems` from linked ingredients.
- **v2 → v3**: Renames `mealItems` → `mealIngredients`, drops items without `ingredientId`, renames nutrition fields (e.g. `caloriesPer100` → `calories`), renames DailyGoals fields (e.g. `caloriesGoal` → `calories`).

---

## State Management

No global state store. Each editor page manages its own form state with `useState`. Edit mode and context are passed via URL search params.

### URL-based Navigation

Editor pages read mode/context from `useSearchParams()`:

- `/meal?id=X` — edit existing meal
- `/meal?date=YYYY-MM-DD` — create meal on specific date
- `/recipe?id=X` — edit existing recipe
- `/recipe` — create new recipe
- `/ingredient?id=X` — edit existing ingredient
- `/ingredient` — create new ingredient
- `/goals` — edit default goals
- `/goals?date=YYYY-MM-DD` — edit date-specific goal override

### Dexie Live Query Hooks (`useMeals.ts`)

| Hook             | Returns               | Used by                                  |
| ---------------- | --------------------- | ---------------------------------------- |
| `useMealsByDate` | `MealWithNutrition[]` | LogsPage                                 |
| `useIngredients` | `Ingredient[]`        | IngredientSearch, RecipesIngredientsPage |
| `useRecipes`     | `Recipe[]`            | MealsPage, RecipesIngredientsPage        |
| `useDailyGoals`  | `NutritionValues`     | LogsPage                                 |

`MealWithNutrition` includes `items: MealIngredientWithName[]` where ingredient names are resolved via DB join.

---

## Routing

| Path          | Component              | Purpose                     |
| ------------- | ---------------------- | --------------------------- |
| `/log`        | LogsPage               | Daily meal log (default)    |
| `/recipes`    | RecipesIngredientsPage | Recipe & ingredient library |
| `/meal`       | MealsPage              | Create/edit meal            |
| `/recipe`     | RecipesPage            | Create/edit recipe          |
| `/ingredient` | IngredientsPage        | Create/edit ingredient      |
| `/goals`      | GoalsPage              | Edit daily nutrition goals  |

Editor pages (`/meal`, `/recipe`, `/ingredient`, `/goals`) hide the bottom nav and have no bottom padding.

---

## Key Behaviors

### Meal Editor (`MealsPage`)

- **Recipe search**: Dropdown appears on 1+ characters; selecting a recipe adds its ingredients for 1 serving.
- **Ingredient search**: Inline search to add individual ingredients.
- **Flat list**: All items are displayed in a flat list (no recipe grouping).
- **Barcode scan**: If ingredient doesn't exist locally, auto-creates from OpenFoodFacts before adding.
- **Save**: Meal name auto-generated from ingredient names. MealIngredient records store nutrition snapshots.

### Recipe Editor (`RecipesPage`)

- Ingredient search + barcode scanner to add items.
- Plus/minus buttons step by `ingredient.defaultServing`.
- Per-serving nutrition preview.
- Saves `RecipeIngredient` join records.

### Ingredient Editor (`IngredientsPage`)

- Barcode scan → OpenFoodFacts lookup auto-fills nutrition.
- On save (edit mode): propagates unit/nutrition changes to all referencing `mealIngredients`.
- On delete: cascade-deletes related `mealIngredients` and `recipeIngredients`.

### Nutrition Calculation

- All nutrition stored and calculated as **per 100g/ml**.
- Actual nutrition = `value × (amount / 100)`.
- `MealIngredient` stores a snapshot — no runtime DB lookups needed for nutrition display.
- Ingredient names are resolved via DB join in `useMealsByDate`.

### Goals

- Single set of default goals (seeded on first run: 2700 kcal).
- Optional per-date overrides.
- `NutritionSummary` shows consumed/goal; tapping navigates to goals editor.

---

## UI / UX Conventions

- **Language**: All UI text is German.
- **Layout**: `h-dvh` root → flex column → `<main>` with `flex-1 min-h-0` for proper scrolling.
- **Scroll pattern**: Pages use `flex-1 min-h-0 overflow-y-auto` on their scrollable container.
- **Buttons**: Editor pages have a sticky bottom save/delete bar.
- **Search inputs**: All have an inline X clear button.
- **Amount controls**: Plus/minus buttons on ingredient amounts (step by `defaultServing`).
- **Icons**: Lucide React icons throughout.
- **Theming**: Dark mode via `next-themes`, CSS variables for colors.

---

## Requirements Checklist

### Core Features

- [x] Log meals with date & time
- [x] Add ingredients to meals (with amount in g/ml)
- [x] Add recipes to meals (adds ingredients for 1 serving)
- [x] Nutrition summary per day (kcal, fat, carbs, protein)
- [x] Extended macros: sugar, salt, fiber
- [x] Daily nutrition goals with defaults
- [x] Per-date goal overrides
- [x] Recipe CRUD (name, servings, ingredients with amounts)
- [x] Ingredient CRUD (name, unit, per-100 nutrition, barcode)
- [x] Barcode scanning (camera) with OpenFoodFacts lookup
- [x] Auto-create ingredient from scanned product

### Data Integrity

- [x] Nutrition snapshot on MealIngredient (per-100 values at save time)
- [x] Every MealIngredient must reference an ingredient (ingredientId required)
- [x] Ingredient update propagates to all referencing mealIngredients
- [x] Ingredient delete cascades to mealIngredients and recipeIngredients
- [x] DB migration v1→v2→v3 (schema evolution)

### UX

- [x] PWA with standalone display and auto-update
- [x] Proper scroll handling on all pages (h-dvh + flex chain)
- [x] Search with inline clear buttons
- [x] Plus/minus amount controls with defaultServing step
- [x] Recipe search in meal editor (1+ char trigger)
- [x] Date navigation with prev/next/today
- [x] Bottom navigation (Tagebuch / Bibliothek)
- [x] Editor pages hide bottom nav

### Pending / Future

- [ ] Export/import data (backup)
