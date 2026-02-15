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
| State        | Zustand 5 (no persist middleware)                |
| Database     | Dexie 4 (IndexedDB), v2 schema                   |
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
│   └── ui
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── checkbox.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── popover.tsx
│       ├── progress.tsx
│       ├── select.tsx
│       ├── separator.tsx
│       ├── sonner.tsx
│       ├── switch.tsx
│       ├── tabs.tsx
│       └── textarea.tsx
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
├── stores
│   └── draft-store.ts
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

**`mealItems`** — Individual items within a meal. Stores a **nutrition snapshot** (per-100 values at save time) so historical data remains stable.
| Field | Type | Notes |
| ------------------------ | -------------- | ------------------------------------ |
| mealId | number | FK to meals |
| ingredientId? | number | FK to ingredients (if linked) |
| name | string | Display name (snapshot) |
| amount | number | Actual amount in g/ml |
| unit | "g" \| "ml" | |
| sourceRecipeName? | string | Which recipe this came from |
| sourceRecipeBaseAmount? | number | Original recipe amount for this item |
| sourceRecipePortions? | number | Selected portions |
| sourceRecipeTotalServings? | number | Recipe's total servings |
| caloriesPer100…fiberPer100 | number | Nutrition per 100 units (snapshot) |

**`dailyGoals`** — Single row with default nutrition targets.

**`dailyGoalOverrides`** — Per-date overrides (unique on `date`).

### Indices (Dexie)

```
ingredients:       ++id, name, barcode, updatedAt
recipes:           ++id, name, updatedAt
recipeIngredients: ++id, recipeId, ingredientId
meals:             ++id, date, createdAt
mealItems:         ++id, mealId, ingredientId
dailyGoals:        ++id
dailyGoalOverrides: ++id, &date
```

### Conceptual Relationships

```
Ingredient  ←─┐
               ├── RecipeIngredient ──→ Recipe
               │
               └── MealItem ──→ Meal
                   (snapshot of ingredient nutrition at save time)
```

- **Recipe** = template (collection of ingredients with amounts and servings).
- **Meal** = instantiation — items are snapshots, optionally linked back to ingredients.
- When an **ingredient is updated**, all referencing `mealItems` are updated with new name/unit/nutrition (`IngredientDrawerContent.onSave`).
- When an **ingredient is deleted**, its `mealItems` and `recipeIngredients` are cascade-deleted.

---

## State Management

### Zustand Store (`drawer-store.ts`)

Holds four editor drafts: `mealDraft`, `recipeDraft`, `ingredientDraft`, `goalsDraft`.

Each has `open`/`close`/`update`/`clear` actions. Meal and recipe drafts also have item-level CRUD (`addMealItem`, `removeMealItem`, `updateMealItem`, etc.).

> **Naming note:** Actions still use "Drawer" suffix (`openMealDrawer`, `closeMealDrawer`…). A future rename to drop "Drawer" is planned.

### Dexie Live Query Hooks (`useMeals.ts`)

| Hook              | Returns               | Used by                                   |
| ----------------- | --------------------- | ----------------------------------------- |
| `useMealsByDate`  | `MealWithNutrition[]` | LogPage                                   |
| `useDayNutrition` | `NutritionValues`     | (available, not yet used)                 |
| `useIngredients`  | `Ingredient[]`        | IngredientSearch, RecipesIngredientsPage  |
| `useRecipes`      | `Recipe[]`            | MealDrawerContent, RecipesIngredientsPage |
| `useDailyGoals`   | `NutritionValues`     | LogPage                                   |

---

## Routing

| Path          | Component               | Purpose                     |
| ------------- | ----------------------- | --------------------------- |
| `/log`        | LogPage                 | Daily meal log (default)    |
| `/recipes`    | RecipesIngredientsPage  | Recipe & ingredient library |
| `/meal`       | MealDrawerContent       | Create/edit meal            |
| `/recipe`     | RecipeDrawerContent     | Create/edit recipe          |
| `/ingredient` | IngredientDrawerContent | Create/edit ingredient      |
| `/goals`      | GoalsDrawerContent      | Edit daily nutrition goals  |

Editor pages (`/meal`, `/recipe`, `/ingredient`, `/goals`) hide the bottom nav and have no bottom padding.

---

## Key Behaviors

### Meal Editor (`MealDrawerContent`)

- **Recipe search**: Dropdown appears on 1+ characters; selecting a recipe populates items with ingredient snapshots.
- **Portion scaling**: `newAmount = baseAmount × (selectedPortions / totalServings)`. Nutrition is always per-100, so only `amount` changes.
- **Ingredient search**: Inline search to add individual ingredients.
- **Grouped display**: Items are grouped by `sourceRecipeName` with "Weitere Zutaten" for ungrouped items.
- **Save**: Meal name auto-generated from recipe names or ingredient names.

### Recipe Editor (`RecipeDrawerContent`)

- Ingredient search + barcode scanner to add items.
- Plus/minus buttons step by `ingredient.defaultServing`.
- Per-serving nutrition preview.
- Saves `RecipeIngredient` join records.

### Ingredient Editor (`IngredientDrawerContent`)

- Barcode scan → OpenFoodFacts lookup auto-fills nutrition.
- On save (edit mode): propagates name/unit/nutrition changes to all referencing `mealItems`.
- On delete: cascade-deletes related `mealItems` and `recipeIngredients`.

### Nutrition Calculation

- All nutrition stored and calculated as **per 100g/ml**.
- Actual nutrition = `per100value × (amount / 100)`.
- `MealItem` stores a snapshot — no runtime DB lookups needed for display.

### Goals

- Single set of default goals (seeded on first run: 2700 kcal).
- Optional per-date overrides.
- `NutritionSummary` shows consumed/goal bar; tapping opens goals editor.

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
- [x] Add recipes to meals (with portion selector)
- [x] Portion-based scaling for recipe items
- [x] Nutrition summary per day (kcal, fat, carbs, protein)
- [x] Extended macros: sugar, salt, fiber
- [x] Daily nutrition goals with defaults
- [x] Per-date goal overrides
- [x] Recipe CRUD (name, servings, ingredients with amounts)
- [x] Ingredient CRUD (name, unit, per-100 nutrition, barcode)
- [x] Barcode scanning (camera) with OpenFoodFacts lookup
- [x] Auto-create ingredient from scanned product

### Data Integrity

- [x] Nutrition snapshot on MealItem (per-100 values at save time)
- [x] Ingredient update propagates to all referencing mealItems
- [x] Ingredient delete cascades to mealItems and recipeIngredients
- [x] DB migration v1→v2 (populates MealItem snapshots from ingredients)

### UX

- [x] PWA with standalone display and auto-update
- [x] Proper scroll handling on all pages (h-dvh + flex chain)
- [x] Search with inline clear buttons
- [x] Plus/minus amount controls with defaultServing step
- [x] Recipe search in meal editor (1+ char trigger)
- [x] Grouped item display by source recipe
- [x] Date navigation with prev/next/today
- [x] Bottom navigation (Tagebuch / Bibliothek)
- [x] Editor pages hide bottom nav

### Pending / Future

- [ ] Export/import data (backup)
