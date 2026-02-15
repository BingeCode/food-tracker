import Dexie, { type EntityTable } from "dexie";
import type {
  Ingredient,
  Recipe,
  RecipeIngredient,
  Meal,
  MealIngredient,
  DailyGoals,
} from "@/types";

class FoodTrackerDB extends Dexie {
  ingredients!: EntityTable<Ingredient, "id">;
  recipes!: EntityTable<Recipe, "id">;
  recipeIngredients!: EntityTable<RecipeIngredient, "id">;
  meals!: EntityTable<Meal, "id">;
  mealIngredients!: EntityTable<MealIngredient, "id">;
  dailyGoals!: EntityTable<DailyGoals, "id">;

  constructor() {
    super("FoodTrackerDB");

    this.version(1).stores({
      ingredients: "++id, name, barcode, updatedAt",
      recipes: "++id, name, updatedAt",
      recipeIngredients: "++id, recipeId, ingredientId",
      meals: "++id, date, createdAt",
      mealIngredients: "++id, mealId, ingredientId",
      dailyGoals: "++id",
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
      fatPct: 30,
      carbsPct: 45,
      proteinPct: 25,
      sugar: 50,
      salt: 6,
      fiber: 30,
    });
  }
}
