// ── Ingredient ──────────────────────────────────────────────

export interface Ingredient {
  id?: number;
  barcode?: string;
  name: string;
  unit: "g" | "ml";
  calories: number; // per 100g/100ml
  fat: number;
  carbs: number;
  sugar: number;
  protein: number;
  salt: number;
  fiber: number;
  defaultServing: number; // in g/ml
  createdAt: Date;
  updatedAt: Date;
}

// ── Recipe ──────────────────────────────────────────────────

export interface Recipe {
  id?: number;
  name: string;
  servings: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipeIngredient {
  id?: number;
  recipeId: number;
  ingredientId: number;
  amount: number; // in g/ml (depends on ingredient unit)
}

// ── Meal ────────────────────────────────────────────────────

export interface Meal {
  id?: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  name: string;
  isManual: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MealItem {
  id?: number;
  mealId: number;
  ingredientId?: number;
  amount: number;
  // Manual entry fields (used when isManual or no ingredientId)
  manualName?: string;
  manualCalories?: number;
  manualFat?: number;
  manualCarbs?: number;
  manualSugar?: number;
  manualProtein?: number;
  manualSalt?: number;
  manualFiber?: number;
}

// ── Goals ───────────────────────────────────────────────────

export interface DailyGoals {
  id?: number;
  caloriesGoal: number;
  fatGoal: number; // in g
  carbsGoal: number; // in g
  proteinGoal: number; // in g
  sugarGoal?: number;
  saltGoal?: number;
  fiberGoal?: number;
}

export interface DailyGoalOverride {
  id?: number;
  date: string; // YYYY-MM-DD (unique)
  caloriesGoal?: number;
  fatGoal?: number;
  carbsGoal?: number;
  proteinGoal?: number;
  sugarGoal?: number;
  saltGoal?: number;
  fiberGoal?: number;
}

// ── Nutrition values (computed) ─────────────────────────────

export interface NutritionValues {
  calories: number;
  fat: number;
  carbs: number;
  sugar: number;
  protein: number;
  salt: number;
  fiber: number;
}

// ── Draft types for Zustand store ───────────────────────────

export interface MealItemDraft {
  ingredientId?: number;
  name: string;
  amount: number;
  unit: "g" | "ml";
  // For manual items without ingredientId
  manualCalories?: number;
  manualFat?: number;
  manualCarbs?: number;
  manualSugar?: number;
  manualProtein?: number;
  manualSalt?: number;
  manualFiber?: number;
}

export interface MealDraft {
  open: boolean;
  mode: "create" | "edit";
  editId?: number;
  time: string;
  inputMode: "search" | "manual";
  sourceRecipeId?: number;
  originalIngredientIds?: number[];
  items: MealItemDraft[];
  // Manual mode fields
  manualName?: string;
  manualCalories?: number;
  manualFat?: number;
  manualCarbs?: number;
  manualSugar?: number;
  manualProtein?: number;
  manualSalt?: number;
  manualFiber?: number;
  saveAsRecipe: boolean;
}

export interface RecipeDraft {
  open: boolean;
  mode: "create" | "edit";
  editId?: number;
  name: string;
  items: MealItemDraft[];
  servings: number;
}

export interface IngredientDraft {
  open: boolean;
  mode: "create" | "edit";
  editId?: number;
  barcode: string;
  name: string;
  unit: "g" | "ml";
  calories: number;
  fat: number;
  carbs: number;
  sugar: number;
  protein: number;
  salt: number;
  fiber: number;
  defaultServing: number;
}

export interface GoalsDraft {
  open: boolean;
  caloriesGoal: number;
  fatGoal: number;
  carbsGoal: number;
  proteinGoal: number;
  sugarGoal: number;
  saltGoal: number;
  fiberGoal: number;
  // Per-day override
  overrideDate?: string;
  overrideCalories?: number;
  overrideFat?: number;
  overrideCarbs?: number;
  overrideProtein?: number;
}

// ── Open Food Facts API ─────────────────────────────────────

export interface OpenFoodFactsResponse {
  code: string;
  status: number;
  status_verbose: string;
  product?: {
    product_name?: string;
    nutrition_data_per?: string;
    nutriments?: {
      "energy-kcal_100g"?: number;
      fat_100g?: number;
      carbohydrates_100g?: number;
      sugars_100g?: number;
      proteins_100g?: number;
      salt_100g?: number;
      fiber_100g?: number;
    };
  };
}
