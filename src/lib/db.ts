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

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  MIGRATION RULES — read before touching schema!            ║
    // ║                                                            ║
    // ║  1. NEVER modify an existing version() block.              ║
    // ║  2. To change schema, ADD a new version(N+1) block below.  ║
    // ║  3. Only indexed columns go in stores(). You can add       ║
    // ║     non-indexed fields to objects freely without a new      ║
    // ║     version.                                               ║
    // ║  4. Use .upgrade(tx => …) for data transforms.             ║
    // ║  5. User data is preserved across upgrades automatically.  ║
    // ╚══════════════════════════════════════════════════════════════╝

    this.version(1).stores({
      ingredients: "++id, name, barcode, updatedAt",
      recipes: "++id, name, updatedAt",
      recipeIngredients: "++id, recipeId, ingredientId",
      meals: "++id, date, createdAt",
      mealIngredients: "++id, mealId, ingredientId",
      dailyGoals: "++id",
    });

    // Future migrations go here, e.g.:
    // this.version(2).stores({ ingredients: "++id, name, barcode, updatedAt, category" })
    //   .upgrade(tx => tx.table("ingredients").toCollection().modify(i => { i.category = "other"; }));
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
