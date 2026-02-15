// ── Ingredient ──────────────────────────────────────────────

export interface Ingredient {
  id: number;
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
  id: number;
  name: string;
  servings: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipeIngredient {
  id: number;
  recipeId: number;
  ingredientId: number;
  amount: number; // in g/ml (depends on ingredient unit)
}

// ── Meal ────────────────────────────────────────────────────

export interface Meal {
  id: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MealIngredient {
  id: number;
  mealId: number;
  ingredientId: number;
  amount: number;
  unit: "g" | "ml";
  // Nutrition per 100g/100ml (snapshot at save time)
  calories: number;
  fat: number;
  carbs: number;
  sugar: number;
  protein: number;
  salt: number;
  fiber: number;
}

// ── Goals ───────────────────────────────────────────────────

export interface DailyGoals {
  id: number;
  calories: number; // kcal target
  fatPct: number; // % of calories from fat
  carbsPct: number; // % of calories from carbs
  proteinPct: number; // % of calories from protein
  sugar: number; // grams
  salt: number; // grams
  fiber: number; // grams
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
