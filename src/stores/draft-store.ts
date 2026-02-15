import { create } from "zustand";
import { format } from "date-fns";
import type {
  MealDraft,
  RecipeDraft,
  IngredientDraft,
  GoalsDraft,
  MealItemDraft,
} from "@/types";

// ── Default drafts ──────────────────────────────────────────

function getTimeNow(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function getToday(): string {
  return format(new Date(), "yyyy-MM-dd");
}

const defaultMealDraft: MealDraft = {
  open: false,
  mode: "create",
  time: getTimeNow(),
  date: getToday(),
  items: [],
};

const defaultRecipeDraft: RecipeDraft = {
  open: false,
  mode: "create",
  name: "",
  items: [],
  servings: 1,
};

const defaultIngredientDraft: IngredientDraft = {
  open: false,
  mode: "create",
  barcode: "",
  name: "",
  unit: "g",
  calories: 0,
  fat: 0,
  carbs: 0,
  sugar: 0,
  protein: 0,
  salt: 0,
  fiber: 0,
  defaultServing: 100,
};

const defaultGoalsDraft: GoalsDraft = {
  open: false,
  caloriesGoal: 2700,
  fatGoal: 90,
  carbsGoal: 304,
  proteinGoal: 169,
  sugarGoal: 50,
  saltGoal: 6,
  fiberGoal: 30,
};

// ── Store interface ─────────────────────────────────────────

interface Store {
  // Drafts
  mealDraft: MealDraft;
  recipeDraft: RecipeDraft;
  ingredientDraft: IngredientDraft;
  goalsDraft: GoalsDraft;

  // ── Meal actions ──────────────────────────────────────────
  openMeals: (mode: "create" | "edit", editId?: number, date?: string) => void;
  closeMeals: () => void;
  updateMealDraft: (partial: Partial<MealDraft>) => void;
  setMealItems: (items: MealItemDraft[]) => void;
  addMealItem: (item: MealItemDraft) => void;
  removeMealItem: (index: number) => void;
  updateMealItem: (index: number, partial: Partial<MealItemDraft>) => void;
  clearMealDraft: () => void;

  // ── Recipe actions ────────────────────────────────────────
  openRecipes: (mode: "create" | "edit", editId?: number) => void;
  closeRecipes: () => void;
  updateRecipeDraft: (partial: Partial<RecipeDraft>) => void;
  setRecipeItems: (items: MealItemDraft[]) => void;
  addRecipeItem: (item: MealItemDraft) => void;
  removeRecipeItem: (index: number) => void;
  updateRecipeItem: (index: number, partial: Partial<MealItemDraft>) => void;
  clearRecipeDraft: () => void;

  // ── Ingredient actions ────────────────────────────────────
  openIngredients: (mode: "create" | "edit", editId?: number) => void;
  closeIngredient: () => void;
  updateIngredientDraft: (partial: Partial<IngredientDraft>) => void;
  clearIngredientDraft: () => void;

  // ── Goals actions ─────────────────────────────────────────
  openGoals: (date?: string) => void;
  closeGoals: () => void;
  updateGoalsDraft: (partial: Partial<GoalsDraft>) => void;
  clearGoalsDraft: () => void;

  // ── Global ────────────────────────────────────────────────
  closeAllSubPages: () => void;
}

// ── Store implementation ────────────────────────────────────

export const useDraftStore = create<Store>((set) => ({
  mealDraft: { ...defaultMealDraft },
  recipeDraft: { ...defaultRecipeDraft },
  ingredientDraft: { ...defaultIngredientDraft },
  goalsDraft: { ...defaultGoalsDraft },

  // ── Meal ──────────────────────────────────────────────────

  openMeals: (mode, editId, date) =>
    set((state) => ({
      mealDraft:
        mode === "edit"
          ? {
              ...defaultMealDraft,
              open: true,
              mode,
              editId,
              ...(date ? { date } : {}),
            }
          : {
              ...state.mealDraft,
              ...defaultMealDraft,
              ...state.mealDraft,
              open: true,
              mode,
              editId: undefined,
              ...(date ? { date } : {}),
              time: getTimeNow(),
            },
    })),

  closeMeals: () =>
    set((state) => ({
      mealDraft:
        state.mealDraft.mode === "edit"
          ? { ...defaultMealDraft, time: getTimeNow() }
          : { ...state.mealDraft, open: false },
    })),

  updateMealDraft: (partial) =>
    set((state) => ({
      mealDraft: { ...state.mealDraft, ...partial },
    })),

  setMealItems: (items) =>
    set((state) => ({
      mealDraft: { ...state.mealDraft, items },
    })),

  addMealItem: (item) =>
    set((state) => ({
      mealDraft: {
        ...state.mealDraft,
        items: [...state.mealDraft.items, item],
      },
    })),

  removeMealItem: (index) =>
    set((state) => ({
      mealDraft: {
        ...state.mealDraft,
        items: state.mealDraft.items.filter((_, i) => i !== index),
      },
    })),

  updateMealItem: (index, partial) =>
    set((state) => ({
      mealDraft: {
        ...state.mealDraft,
        items: state.mealDraft.items.map((item, i) =>
          i === index ? { ...item, ...partial } : item,
        ),
      },
    })),

  clearMealDraft: () =>
    set({ mealDraft: { ...defaultMealDraft, time: getTimeNow() } }),

  // ── Recipe ────────────────────────────────────────────────

  openRecipes: (mode, editId) =>
    set((state) => ({
      recipeDraft:
        mode === "edit"
          ? { ...defaultRecipeDraft, open: true, mode, editId }
          : {
              ...state.recipeDraft,
              ...defaultRecipeDraft,
              ...state.recipeDraft,
              open: true,
              mode,
              editId: undefined,
            },
    })),

  closeRecipes: () =>
    set((state) => ({
      recipeDraft:
        state.recipeDraft.mode === "edit"
          ? { ...defaultRecipeDraft }
          : { ...state.recipeDraft, open: false },
    })),

  updateRecipeDraft: (partial) =>
    set((state) => ({
      recipeDraft: { ...state.recipeDraft, ...partial },
    })),

  setRecipeItems: (items) =>
    set((state) => ({
      recipeDraft: { ...state.recipeDraft, items },
    })),

  addRecipeItem: (item) =>
    set((state) => ({
      recipeDraft: {
        ...state.recipeDraft,
        items: [...state.recipeDraft.items, item],
      },
    })),

  removeRecipeItem: (index) =>
    set((state) => ({
      recipeDraft: {
        ...state.recipeDraft,
        items: state.recipeDraft.items.filter((_, i) => i !== index),
      },
    })),

  updateRecipeItem: (index, partial) =>
    set((state) => ({
      recipeDraft: {
        ...state.recipeDraft,
        items: state.recipeDraft.items.map((item, i) =>
          i === index ? { ...item, ...partial } : item,
        ),
      },
    })),

  clearRecipeDraft: () => set({ recipeDraft: { ...defaultRecipeDraft } }),

  // ── Ingredient ────────────────────────────────────────────

  openIngredients: (mode, editId) =>
    set((state) => ({
      ingredientDraft:
        mode === "edit"
          ? { ...defaultIngredientDraft, open: true, mode, editId }
          : {
              ...state.ingredientDraft,
              ...defaultIngredientDraft,
              ...state.ingredientDraft,
              open: true,
              mode,
              editId: undefined,
            },
    })),

  closeIngredient: () =>
    set((state) => ({
      ingredientDraft:
        state.ingredientDraft.mode === "edit"
          ? { ...defaultIngredientDraft }
          : { ...state.ingredientDraft, open: false },
    })),

  updateIngredientDraft: (partial) =>
    set((state) => ({
      ingredientDraft: { ...state.ingredientDraft, ...partial },
    })),

  clearIngredientDraft: () =>
    set({ ingredientDraft: { ...defaultIngredientDraft } }),

  // ── Goals ─────────────────────────────────────────────────

  openGoals: (date) =>
    set((state) => ({
      goalsDraft: { ...state.goalsDraft, open: true, overrideDate: date },
    })),

  closeGoals: () =>
    set((state) => ({
      goalsDraft: { ...state.goalsDraft, open: false },
    })),

  updateGoalsDraft: (partial) =>
    set((state) => ({
      goalsDraft: { ...state.goalsDraft, ...partial },
    })),

  clearGoalsDraft: () => set({ goalsDraft: { ...defaultGoalsDraft } }),

  // ── Global ────────────────────────────────────────────────

  closeAllSubPages: () =>
    set((state) => ({
      mealDraft: { ...state.mealDraft, open: false },
      recipeDraft: { ...state.recipeDraft, open: false },
      ingredientDraft: { ...state.ingredientDraft, open: false },
      goalsDraft: { ...state.goalsDraft, open: false },
    })),
}));
