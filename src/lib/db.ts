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
