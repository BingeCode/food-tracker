import Dexie, { type EntityTable } from "dexie";
import type {
  Ingredient,
  Recipe,
  RecipeIngredient,
  Meal,
  MealIngredient,
  DailyGoals,
  DailyGoalOverride,
} from "@/types";

class FoodTrackerDB extends Dexie {
  ingredients!: EntityTable<Ingredient, "id">;
  recipes!: EntityTable<Recipe, "id">;
  recipeIngredients!: EntityTable<RecipeIngredient, "id">;
  meals!: EntityTable<Meal, "id">;
  mealIngredients!: EntityTable<MealIngredient, "id">;
  dailyGoals!: EntityTable<DailyGoals, "id">;
  dailyGoalOverrides!: EntityTable<DailyGoalOverride, "id">;

  constructor() {
    super("FoodTrackerDB");

    // ── v1: original schema ─────────────────────────────────
    this.version(1).stores({
      ingredients: "++id, name, barcode, updatedAt",
      recipes: "++id, name, updatedAt",
      recipeIngredients: "++id, recipeId, ingredientId",
      meals: "++id, date, createdAt",
      mealItems: "++id, mealId, ingredientId",
      dailyGoals: "++id",
      dailyGoalOverrides: "++id, &date",
    });

    // ── v2: populate per-100 nutrition snapshots on mealItems ─
    this.version(2)
      .stores({
        ingredients: "++id, name, barcode, updatedAt",
        recipes: "++id, name, updatedAt",
        recipeIngredients: "++id, recipeId, ingredientId",
        meals: "++id, date, createdAt",
        mealItems: "++id, mealId, ingredientId",
        dailyGoals: "++id",
        dailyGoalOverrides: "++id, &date",
      })
      .upgrade(async (tx) => {
        const mealItems = await tx.table("mealItems").toArray();
        const ingredients = await tx.table("ingredients").toArray();
        const ingMap = new Map(
          ingredients.map((i: Record<string, unknown>) => [i.id, i]),
        );

        for (const item of mealItems) {
          const updates: Record<string, unknown> = {};
          if (item.ingredientId && ingMap.has(item.ingredientId)) {
            const ing = ingMap.get(item.ingredientId)!;
            updates.name = ing.name;
            updates.unit = ing.unit;
            updates.caloriesPer100 = ing.calories;
            updates.fatPer100 = ing.fat;
            updates.carbsPer100 = ing.carbs;
            updates.sugarPer100 = ing.sugar;
            updates.proteinPer100 = ing.protein;
            updates.saltPer100 = ing.salt;
            updates.fiberPer100 = ing.fiber;
          } else {
            const factor = item.amount > 0 ? 100 / item.amount : 0;
            updates.name = item.manualName || "Unbekannt";
            updates.unit = "g";
            updates.caloriesPer100 = (item.manualCalories || 0) * factor;
            updates.fatPer100 = (item.manualFat || 0) * factor;
            updates.carbsPer100 = (item.manualCarbs || 0) * factor;
            updates.sugarPer100 = (item.manualSugar || 0) * factor;
            updates.proteinPer100 = (item.manualProtein || 0) * factor;
            updates.saltPer100 = (item.manualSalt || 0) * factor;
            updates.fiberPer100 = (item.manualFiber || 0) * factor;
          }
          await tx.table("mealItems").update(item.id, updates);
        }

        const meals = await tx.table("meals").toArray();
        for (const meal of meals) {
          if ("isManual" in meal) {
            await tx.table("meals").update(meal.id, { isManual: undefined });
          }
        }
      });

    // ── v3: rename mealItems→mealIngredients, simplify field names ─
    this.version(3)
      .stores({
        ingredients: "++id, name, barcode, updatedAt",
        recipes: "++id, name, updatedAt",
        recipeIngredients: "++id, recipeId, ingredientId",
        meals: "++id, date, createdAt",
        mealItems: null, // Drop old table
        mealIngredients: "++id, mealId, ingredientId",
        dailyGoals: "++id",
        dailyGoalOverrides: "++id, &date",
      })
      .upgrade(async (tx) => {
        // 1. Migrate mealItems → mealIngredients
        const oldItems = await tx.table("mealItems").toArray();
        const newTable = tx.table("mealIngredients");

        for (const item of oldItems) {
          // Skip items without ingredientId (orphaned manual entries)
          if (!item.ingredientId) continue;

          await newTable.add({
            mealId: item.mealId,
            ingredientId: item.ingredientId,
            amount: item.amount,
            unit: item.unit ?? "g",
            calories: item.caloriesPer100 ?? 0,
            fat: item.fatPer100 ?? 0,
            carbs: item.carbsPer100 ?? 0,
            sugar: item.sugarPer100 ?? 0,
            protein: item.proteinPer100 ?? 0,
            salt: item.saltPer100 ?? 0,
            fiber: item.fiberPer100 ?? 0,
          });
        }

        // 2. Migrate DailyGoals field names (caloriesGoal → calories, etc.)
        const goals = await tx.table("dailyGoals").toArray();
        for (const goal of goals) {
          await tx.table("dailyGoals").update(goal.id, {
            calories: goal.caloriesGoal ?? goal.calories ?? 2700,
            fat: goal.fatGoal ?? goal.fat ?? 90,
            carbs: goal.carbsGoal ?? goal.carbs ?? 304,
            protein: goal.proteinGoal ?? goal.protein ?? 169,
            sugar: goal.sugarGoal ?? goal.sugar ?? 50,
            salt: goal.saltGoal ?? goal.salt ?? 6,
            fiber: goal.fiberGoal ?? goal.fiber ?? 30,
          });
        }

        // 3. Migrate DailyGoalOverride field names
        const overrides = await tx.table("dailyGoalOverrides").toArray();
        for (const o of overrides) {
          const updates: Record<string, unknown> = {};
          if (o.caloriesGoal !== undefined) updates.calories = o.caloriesGoal;
          if (o.fatGoal !== undefined) updates.fat = o.fatGoal;
          if (o.carbsGoal !== undefined) updates.carbs = o.carbsGoal;
          if (o.proteinGoal !== undefined) updates.protein = o.proteinGoal;
          if (o.sugarGoal !== undefined) updates.sugar = o.sugarGoal;
          if (o.saltGoal !== undefined) updates.salt = o.saltGoal;
          if (o.fiberGoal !== undefined) updates.fiber = o.fiberGoal;
          if (Object.keys(updates).length > 0) {
            await tx.table("dailyGoalOverrides").update(o.id, updates);
          }
        }
      });
  }
}

export const db = new FoodTrackerDB();

// Seed default goals on first run
export async function seedDefaults() {
  const count = await db.dailyGoals.count();
  if (count === 0) {
    await db.dailyGoals.add({
      calories: 2700,
      fat: 90,
      carbs: 304,
      protein: 169,
      sugar: 50,
      salt: 6,
      fiber: 30,
    });
  }
}
