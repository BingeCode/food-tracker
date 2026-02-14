import type { OpenFoodFactsResponse } from "@/types";

const API_BASE = "https://world.openfoodfacts.net/api/v2/product";
const USER_AGENT = "FoodTracker/v0.1 (accounts@benediktscheffbuch.de)";

export interface ProductResult {
  found: boolean;
  name: string;
  unit: "g" | "ml";
  calories: number;
  fat: number;
  carbs: number;
  sugar: number;
  protein: number;
  salt: number;
  fiber: number;
}

export async function fetchProductByBarcode(
  barcode: string,
): Promise<ProductResult> {
  const url = `${API_BASE}/${encodeURIComponent(barcode)}?product_type=food&cc=de&lc=de&fields=product_name,nutriments,nutrition_data_per`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const data: OpenFoodFactsResponse = await response.json();

  if (data.status !== 1 || !data.product) {
    return {
      found: false,
      name: "",
      unit: "g",
      calories: 0,
      fat: 0,
      carbs: 0,
      sugar: 0,
      protein: 0,
      salt: 0,
      fiber: 0,
    };
  }

  const { product } = data;
  const nutriments = product.nutriments ?? {};

  // Determine unit from nutrition_data_per (e.g. "100ml" → ml, "100g" → g)
  const unit: "g" | "ml" = product.nutrition_data_per
    ?.toLowerCase()
    .includes("ml")
    ? "ml"
    : "g";

  return {
    found: true,
    name: product.product_name ?? "",
    unit,
    calories: nutriments["energy-kcal_100g"] ?? 0,
    fat: nutriments.fat_100g ?? 0,
    carbs: nutriments.carbohydrates_100g ?? 0,
    sugar: nutriments.sugars_100g ?? 0,
    protein: nutriments.proteins_100g ?? 0,
    salt: nutriments.salt_100g ?? 0,
    fiber: nutriments.fiber_100g ?? 0,
  };
}
