import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { Meal, MealItem, Ingredient, NutritionValues } from "@/types";

/**
 * Live query for all meals on a given date, including their items
 * and computed nutrition values.
 */
export interface MealWithNutrition extends Meal {
  items: MealItem[];
  nutrition: NutritionValues;
}

export function useMealsByDate(date: string): MealWithNutrition[] | undefined {
  return useLiveQuery(async () => {
    const meals = await db.meals.where("date").equals(date).toArray();

    const results: MealWithNutrition[] = [];

    for (const meal of meals) {
      const items = await db.mealItems
        .where("mealId")
        .equals(meal.id!)
        .toArray();

      let nutrition: NutritionValues = {
        calories: 0,
        fat: 0,
        carbs: 0,
        sugar: 0,
        protein: 0,
        salt: 0,
        fiber: 0,
      };

      for (const item of items) {
        if (item.ingredientId) {
          const ingredient = await db.ingredients.get(item.ingredientId);
          if (ingredient) {
            const factor = item.amount / 100;
            nutrition = {
              calories: nutrition.calories + ingredient.calories * factor,
              fat: nutrition.fat + ingredient.fat * factor,
              carbs: nutrition.carbs + ingredient.carbs * factor,
              sugar: nutrition.sugar + ingredient.sugar * factor,
              protein: nutrition.protein + ingredient.protein * factor,
              salt: nutrition.salt + ingredient.salt * factor,
              fiber: nutrition.fiber + ingredient.fiber * factor,
            };
          }
        } else {
          // Manual entry
          nutrition = {
            calories: nutrition.calories + (item.manualCalories ?? 0),
            fat: nutrition.fat + (item.manualFat ?? 0),
            carbs: nutrition.carbs + (item.manualCarbs ?? 0),
            sugar: nutrition.sugar + (item.manualSugar ?? 0),
            protein: nutrition.protein + (item.manualProtein ?? 0),
            salt: nutrition.salt + (item.manualSalt ?? 0),
            fiber: nutrition.fiber + (item.manualFiber ?? 0),
          };
        }
      }

      results.push({ ...meal, items, nutrition });
    }

    // Sort by time
    results.sort((a, b) => a.time.localeCompare(b.time));

    return results;
  }, [date]);
}

/**
 * Live query for a single meal with all items.
 */
export function useMealById(mealId: number | undefined) {
  return useLiveQuery(async () => {
    if (!mealId) return undefined;
    const meal = await db.meals.get(mealId);
    if (!meal) return undefined;
    const items = await db.mealItems.where("mealId").equals(mealId).toArray();
    return { ...meal, items };
  }, [mealId]);
}

/**
 * Live query for daily goals, merged with any overrides for the given date.
 */
export function useGoalsForDate(date: string) {
  return useLiveQuery(async () => {
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
        protein: 169,
        sugar: 50,
        salt: 6,
        fiber: 30,
      };
    }

    return {
      calories: override?.caloriesGoal ?? defaults.caloriesGoal,
      fat: override?.fatGoal ?? defaults.fatGoal,
      carbs: override?.carbsGoal ?? defaults.carbsGoal,
      protein: override?.proteinGoal ?? defaults.proteinGoal,
      sugar: override?.sugarGoal ?? defaults.sugarGoal ?? 50,
      salt: override?.saltGoal ?? defaults.saltGoal ?? 6,
      fiber: override?.fiberGoal ?? defaults.fiberGoal ?? 30,
    };
  }, [date]);
}

/**
 * Live query for daily nutrition totals.
 */
export function useDayNutrition(date: string): NutritionValues | undefined {
  return useLiveQuery(async () => {
    const meals = await db.meals.where("date").equals(date).toArray();
    const mealIds = meals.map((m) => m.id!);
    if (mealIds.length === 0) {
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

    const allItems = await db.mealItems
      .where("mealId")
      .anyOf(mealIds)
      .toArray();

    let nutrition: NutritionValues = {
      calories: 0,
      fat: 0,
      carbs: 0,
      sugar: 0,
      protein: 0,
      salt: 0,
      fiber: 0,
    };

    for (const item of allItems) {
      if (item.ingredientId) {
        const ingredient = await db.ingredients.get(item.ingredientId);
        if (ingredient) {
          const factor = item.amount / 100;
          nutrition = {
            calories: nutrition.calories + ingredient.calories * factor,
            fat: nutrition.fat + ingredient.fat * factor,
            carbs: nutrition.carbs + ingredient.carbs * factor,
            sugar: nutrition.sugar + ingredient.sugar * factor,
            protein: nutrition.protein + ingredient.protein * factor,
            salt: nutrition.salt + ingredient.salt * factor,
            fiber: nutrition.fiber + ingredient.fiber * factor,
          };
        }
      } else {
        nutrition = {
          calories: nutrition.calories + (item.manualCalories ?? 0),
          fat: nutrition.fat + (item.manualFat ?? 0),
          carbs: nutrition.carbs + (item.manualCarbs ?? 0),
          sugar: nutrition.sugar + (item.manualSugar ?? 0),
          protein: nutrition.protein + (item.manualProtein ?? 0),
          salt: nutrition.salt + (item.manualSalt ?? 0),
          fiber: nutrition.fiber + (item.manualFiber ?? 0),
        };
      }
    }

    return nutrition;
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
 * Live query for recipe ingredients with their ingredient data.
 */
export function useRecipeIngredients(recipeId: number | undefined) {
  return useLiveQuery(async () => {
    if (!recipeId) return [];
    const ris = await db.recipeIngredients
      .where("recipeId")
      .equals(recipeId)
      .toArray();

    const items = await Promise.all(
      ris.map(async (ri) => {
        const ingredient = await db.ingredients.get(ri.ingredientId);
        return {
          ...ri,
          ingredient,
        };
      }),
    );

    return items;
  }, [recipeId]);
}

/**
 * Live query for daily goals (returns standard or override for date).
 */
export function useDailyGoals(date: string) {
  return useLiveQuery(async () => {
    // 1. Check override
    const override = await db.dailyGoalOverrides
      .where("date")
      .equals(date)
      .first();

    // 2. Get defaults
    const defaults = await db.dailyGoals.orderBy("id").first();

    // 3. Merge
    // Default fallback values
    const mergedGoals = {
      caloriesGoal: 2000,
      fatGoal: 70,
      carbsGoal: 260,
      proteinGoal: 50,
      sugarGoal: 90,
      saltGoal: 6,
      fiberGoal: 30,
      ...defaults,
    };

    if (override) {
      if (override.caloriesGoal)
        mergedGoals.caloriesGoal = override.caloriesGoal;
      if (override.fatGoal) mergedGoals.fatGoal = override.fatGoal;
      if (override.carbsGoal) mergedGoals.carbsGoal = override.carbsGoal;
      if (override.proteinGoal) mergedGoals.proteinGoal = override.proteinGoal;
      if (override.sugarGoal) mergedGoals.sugarGoal = override.sugarGoal;
      if (override.saltGoal) mergedGoals.saltGoal = override.saltGoal;
      if (override.fiberGoal) mergedGoals.fiberGoal = override.fiberGoal;
    }

    return {
      calories: mergedGoals.caloriesGoal,
      fat: mergedGoals.fatGoal,
      carbs: mergedGoals.carbsGoal,
      protein: mergedGoals.proteinGoal,
      sugar: mergedGoals.sugarGoal ?? 0,
      salt: mergedGoals.saltGoal ?? 0,
      fiber: mergedGoals.fiberGoal ?? 0,
    };
  }, [date]);
}
