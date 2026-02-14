import { db } from "./db";
import type { NutritionValues, MealItem, MealItemDraft } from "@/types";

/**
 * Calculate nutrition values for a single meal item.
 * If ingredientId is set, values are computed from the ingredient's per-100g/ml data.
 * If manual values are set, those are used directly (they represent totals for the given amount).
 */
export async function calculateMealItemNutrition(
  item: MealItem,
): Promise<NutritionValues> {
  if (item.ingredientId) {
    const ingredient = await db.ingredients.get(item.ingredientId);
    if (!ingredient) return zeroNutrition();

    const factor = item.amount / 100;
    return {
      calories: ingredient.calories * factor,
      fat: ingredient.fat * factor,
      carbs: ingredient.carbs * factor,
      sugar: ingredient.sugar * factor,
      protein: ingredient.protein * factor,
      salt: ingredient.salt * factor,
      fiber: ingredient.fiber * factor,
    };
  }

  // Manual entry — values are absolute totals
  return {
    calories: item.manualCalories ?? 0,
    fat: item.manualFat ?? 0,
    carbs: item.manualCarbs ?? 0,
    sugar: item.manualSugar ?? 0,
    protein: item.manualProtein ?? 0,
    salt: item.manualSalt ?? 0,
    fiber: item.manualFiber ?? 0,
  };
}

/**
 * Calculate nutrition for a draft meal item (used in drawer before saving).
 * Resolves ingredient data from DB if ingredientId is present.
 */
export async function calculateDraftItemNutrition(
  item: MealItemDraft,
): Promise<NutritionValues> {
  if (item.ingredientId) {
    const ingredient = await db.ingredients.get(item.ingredientId);
    if (!ingredient) return zeroNutrition();

    const factor = item.amount / 100;
    return {
      calories: ingredient.calories * factor,
      fat: ingredient.fat * factor,
      carbs: ingredient.carbs * factor,
      sugar: ingredient.sugar * factor,
      protein: ingredient.protein * factor,
      salt: ingredient.salt * factor,
      fiber: ingredient.fiber * factor,
    };
  }

  // Manual draft item
  return {
    calories: item.manualCalories ?? 0,
    fat: item.manualFat ?? 0,
    carbs: item.manualCarbs ?? 0,
    sugar: item.manualSugar ?? 0,
    protein: item.manualProtein ?? 0,
    salt: item.manualSalt ?? 0,
    fiber: item.manualFiber ?? 0,
  };
}

/**
 * Sum up nutrition values for a list of meal items.
 */
export async function calculateMealNutrition(
  items: MealItem[],
): Promise<NutritionValues> {
  const results = await Promise.all(items.map(calculateMealItemNutrition));
  return sumNutrition(results);
}

/**
 * Sum up nutrition for draft items (used in UI previews).
 */
export async function calculateDraftNutrition(
  items: MealItemDraft[],
): Promise<NutritionValues> {
  const results = await Promise.all(items.map(calculateDraftItemNutrition));
  return sumNutrition(results);
}

/**
 * Calculate total and per-serving nutrition for a recipe.
 */
export async function calculateRecipeNutrition(
  recipeId: number,
): Promise<{ total: NutritionValues; perServing: NutritionValues }> {
  const recipe = await db.recipes.get(recipeId);
  const recipeIngredients = await db.recipeIngredients
    .where("recipeId")
    .equals(recipeId)
    .toArray();

  const nutritionPromises = recipeIngredients.map(async (ri) => {
    const ingredient = await db.ingredients.get(ri.ingredientId);
    if (!ingredient) return zeroNutrition();

    const factor = ri.amount / 100;
    return {
      calories: ingredient.calories * factor,
      fat: ingredient.fat * factor,
      carbs: ingredient.carbs * factor,
      sugar: ingredient.sugar * factor,
      protein: ingredient.protein * factor,
      salt: ingredient.salt * factor,
      fiber: ingredient.fiber * factor,
    };
  });

  const results = await Promise.all(nutritionPromises);
  const total = sumNutrition(results);
  const servings = recipe?.servings ?? 1;

  return {
    total,
    perServing: {
      calories: total.calories / servings,
      fat: total.fat / servings,
      carbs: total.carbs / servings,
      sugar: total.sugar / servings,
      protein: total.protein / servings,
      salt: total.salt / servings,
      fiber: total.fiber / servings,
    },
  };
}

/**
 * Get effective goals for a specific date.
 * Merges daily_goal_overrides (if any) with default daily_goals.
 */
export async function getGoalsForDate(
  date: string,
): Promise<NutritionValues & { calories: number }> {
  const defaults = await db.dailyGoals.toCollection().first();
  const override = await db.dailyGoalOverrides
    .where("date")
    .equals(date)
    .first();

  if (!defaults) {
    return {
      calories: 2700,
      fat: 90,
      carbs: 304,
      sugar: 50,
      protein: 169,
      salt: 6,
      fiber: 30,
    };
  }

  return {
    calories: override?.caloriesGoal ?? defaults.caloriesGoal,
    fat: override?.fatGoal ?? defaults.fatGoal,
    carbs: override?.carbsGoal ?? defaults.carbsGoal,
    sugar: override?.sugarGoal ?? defaults.sugarGoal ?? 50,
    protein: override?.proteinGoal ?? defaults.proteinGoal,
    salt: override?.saltGoal ?? defaults.saltGoal ?? 6,
    fiber: override?.fiberGoal ?? defaults.fiberGoal ?? 30,
  };
}

/**
 * Calculate total consumed nutrition for a given date.
 */
export async function getDayNutrition(date: string): Promise<NutritionValues> {
  const meals = await db.meals.where("date").equals(date).toArray();
  const mealIds = meals.map((m) => m.id!);

  if (mealIds.length === 0) return zeroNutrition();

  const allItems = await db.mealItems.where("mealId").anyOf(mealIds).toArray();

  return calculateMealNutrition(allItems);
}

/**
 * Generate a meal name based on recipe modifications.
 */
export function generateMealName(
  recipeName: string | undefined,
  originalIngredientIds: number[] | undefined,
  currentItems: MealItemDraft[],
): string {
  const currentIds = currentItems
    .filter((i) => i.ingredientId)
    .map((i) => i.ingredientId!);

  // No recipe selected — comma-separated ingredient names
  if (!recipeName) {
    const names = currentItems.map((i) => i.name).filter(Boolean);
    return names.length > 0 ? names.join(", ") : "Mahlzeit";
  }

  // Recipe selected but no original IDs to compare (shouldn't happen, but safe)
  if (!originalIngredientIds) return recipeName;

  const added = currentItems
    .filter(
      (i) => i.ingredientId && !originalIngredientIds.includes(i.ingredientId),
    )
    .map((i) => i.name);

  const removed = originalIngredientIds.filter(
    (id) => !currentIds.includes(id),
  );

  if (added.length === 0 && removed.length === 0) return recipeName;

  let name = recipeName;
  if (added.length > 0) {
    name += ` mit ${added.join(", ")}`;
  }
  if (removed.length > 0) {
    // We'd need ingredient names for removed IDs — but we only have IDs here.
    // The caller should provide names. For now, just note the count.
    name +=
      added.length > 0
        ? ` und ohne ${removed.length} Zutat${removed.length > 1 ? "en" : ""}`
        : ` ohne ${removed.length} Zutat${removed.length > 1 ? "en" : ""}`;
  }

  return name;
}

// ── Helpers ──────────────────────────────────────────────────

function zeroNutrition(): NutritionValues {
  return {
    calories: 0,
    fat: 0,
    carbs: 0,
    sugar: 0,
    protein: 0,
    salt: 0,
    fiber: 0,
  };
}

function sumNutrition(values: NutritionValues[]): NutritionValues {
  return values.reduce(
    (acc, v) => ({
      calories: acc.calories + v.calories,
      fat: acc.fat + v.fat,
      carbs: acc.carbs + v.carbs,
      sugar: acc.sugar + v.sugar,
      protein: acc.protein + v.protein,
      salt: acc.salt + v.salt,
      fiber: acc.fiber + v.fiber,
    }),
    zeroNutrition(),
  );
}

/**
 * Round a nutrition value for display (1 decimal).
 */
export function roundNutrition(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Format a nutrition value as a compact string like "1347/2700".
 */
export function formatCompact(consumed: number, goal: number): string {
  return `${Math.round(consumed)}/${Math.round(goal)}`;
}
