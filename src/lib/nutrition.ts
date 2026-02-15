import { db } from "./db";
import type { NutritionValues, MealItem } from "@/types";

/**
 * Calculate nutrition values for a single meal item.
 * Uses the per-100 snapshot stored on the item.
 */
export function calculateMealItemNutrition(item: MealItem): NutritionValues {
  const factor = item.amount / 100;
  return {
    calories: (item.caloriesPer100 ?? 0) * factor,
    fat: (item.fatPer100 ?? 0) * factor,
    carbs: (item.carbsPer100 ?? 0) * factor,
    sugar: (item.sugarPer100 ?? 0) * factor,
    protein: (item.proteinPer100 ?? 0) * factor,
    salt: (item.saltPer100 ?? 0) * factor,
    fiber: (item.fiberPer100 ?? 0) * factor,
  };
}

/**
 * Sum up nutrition values for a list of meal items.
 */
export function calculateMealNutrition(items: MealItem[]): NutritionValues {
  return sumNutrition(items.map(calculateMealItemNutrition));
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
