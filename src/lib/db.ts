import Dexie, { type EntityTable } from "dexie";
import type {
  Ingredient,
  Recipe,
  RecipeIngredient,
  Meal,
  MealItem,
  DailyGoals,
  DailyGoalOverride,
} from "@/types";

class FoodTrackerDB extends Dexie {
  ingredients!: EntityTable<Ingredient, "id">;
  recipes!: EntityTable<Recipe, "id">;
  recipeIngredients!: EntityTable<RecipeIngredient, "id">;
  meals!: EntityTable<Meal, "id">;
  mealItems!: EntityTable<MealItem, "id">;
  dailyGoals!: EntityTable<DailyGoals, "id">;
  dailyGoalOverrides!: EntityTable<DailyGoalOverride, "id">;

  constructor() {
    super("FoodTrackerDB");

    this.version(1).stores({
      ingredients: "++id, name, barcode, updatedAt",
      recipes: "++id, name, updatedAt",
      recipeIngredients: "++id, recipeId, ingredientId",
      meals: "++id, date, createdAt",
      mealItems: "++id, mealId, ingredientId",
      dailyGoals: "++id",
      dailyGoalOverrides: "++id, &date",
    });

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
        // Migrate existing MealItems: populate name, unit, and per-100 nutrition
        const mealItems = await tx.table("mealItems").toArray();
        const ingredients = await tx.table("ingredients").toArray();
        const ingMap = new Map(ingredients.map((i: any) => [i.id, i]));

        for (const item of mealItems) {
          const updates: any = {};
          if (item.ingredientId && ingMap.has(item.ingredientId)) {
            const ing = ingMap.get(item.ingredientId);
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
            // Manual item: convert total values back to per-100
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

        // Remove isManual from meals
        const meals = await tx.table("meals").toArray();
        for (const meal of meals) {
          if ("isManual" in meal) {
            await tx.table("meals").update(meal.id, { isManual: undefined });
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
      caloriesGoal: 2700,
      fatGoal: 90,
      carbsGoal: 304,
      proteinGoal: 169,
      sugarGoal: 50,
      saltGoal: 6,
      fiberGoal: 30,
    });
  }
}
