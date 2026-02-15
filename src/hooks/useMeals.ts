import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { Meal, MealIngredient, Ingredient, NutritionValues } from "@/types";

function calcNutrition(items: MealIngredient[]): NutritionValues {
  return items.reduce(
    (acc, item) => {
      const factor = item.amount / 100;
      return {
        calories: acc.calories + item.calories * factor,
        fat: acc.fat + item.fat * factor,
        carbs: acc.carbs + item.carbs * factor,
        sugar: acc.sugar + item.sugar * factor,
        protein: acc.protein + item.protein * factor,
        salt: acc.salt + item.salt * factor,
        fiber: acc.fiber + item.fiber * factor,
      };
    },
    { calories: 0, fat: 0, carbs: 0, sugar: 0, protein: 0, salt: 0, fiber: 0 },
  );
}

/**
 * A MealIngredient enriched with the ingredient's display name.
 */
export interface MealIngredientWithName extends MealIngredient {
  ingredientName: string;
}

export interface MealWithNutrition extends Meal {
  items: MealIngredientWithName[];
  nutrition: NutritionValues;
}

/**
 * Live query for all meals on a given date, including their ingredients
 * and computed nutrition values.
 */
export function useMealsByDate(date: string): MealWithNutrition[] | undefined {
  return useLiveQuery(async () => {
    const meals = await db.meals.where("date").equals(date).toArray();

    const results: MealWithNutrition[] = [];

    for (const meal of meals) {
      const items = await db.mealIngredients
        .where("mealId")
        .equals(meal.id)
        .toArray();

      // Resolve ingredient names
      const itemsWithNames: MealIngredientWithName[] = await Promise.all(
        items.map(async (item) => {
          const ing = await db.ingredients.get(item.ingredientId);
          return { ...item, ingredientName: ing?.name ?? "Unbekannt" };
        }),
      );

      const nutrition = calcNutrition(items);
      results.push({ ...meal, items: itemsWithNames, nutrition });
    }

    // Sort by time
    results.sort((a, b) => a.time.localeCompare(b.time));

    return results;
  }, [date]);
}

/**
 * Live query for all ingredients (optionally filtered by search term).
 */
export function useIngredients(search?: string) {
  return useLiveQuery(async () => {
    let ingredients: Ingredient[];
    if (search && search.trim().length > 0) {
      const term = search.trim().toLowerCase();
      ingredients = await db.ingredients
        .filter((i) => i.name.toLowerCase().includes(term))
        .toArray();
    } else {
      ingredients = await db.ingredients
        .orderBy("updatedAt")
        .reverse()
        .toArray();
    }
    return ingredients;
  }, [search]);
}

/**
 * Live query for all recipes (optionally filtered by search term).
 */
export function useRecipes(search?: string) {
  return useLiveQuery(async () => {
    if (search && search.trim().length > 0) {
      const term = search.trim().toLowerCase();
      return db.recipes
        .filter((r) => r.name.toLowerCase().includes(term))
        .toArray();
    }
    return db.recipes.orderBy("updatedAt").reverse().toArray();
  }, [search]);
}

/**
 * Live query for daily goals (returns defaults merged with any override for date).
 */
export function useDailyGoals(date: string) {
  return useLiveQuery(async () => {
    const override = await db.dailyGoalOverrides
      .where("date")
      .equals(date)
      .first();

    const defaults = await db.dailyGoals.orderBy("id").first();

    const fallback: NutritionValues = {
      calories: 2000,
      fat: 70,
      carbs: 260,
      protein: 50,
      sugar: 90,
      salt: 6,
      fiber: 30,
    };

    const base: NutritionValues = defaults
      ? {
          calories: defaults.calories,
          fat: defaults.fat,
          carbs: defaults.carbs,
          protein: defaults.protein,
          sugar: defaults.sugar,
          salt: defaults.salt,
          fiber: defaults.fiber,
        }
      : fallback;

    if (override) {
      return {
        calories: override.calories ?? base.calories,
        fat: override.fat ?? base.fat,
        carbs: override.carbs ?? base.carbs,
        protein: override.protein ?? base.protein,
        sugar: override.sugar ?? base.sugar,
        salt: override.salt ?? base.salt,
        fiber: override.fiber ?? base.fiber,
      };
    }

    return base;
  }, [date]);
}
