// Código de barras — mapeamento do Open Food Facts para macros (por 100 g).
// A consulta HTTP acontece na Server Action (`lookupBarcode`); aqui só o mapper puro.
export type BarcodeProduct = {
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

export function isValidBarcode(code: string): boolean {
  return /^\d{6,14}$/.test(String(code).trim());
}

type OffNutriments = {
  "energy-kcal_100g"?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
  fiber_100g?: number;
};

type OffProduct = {
  product_name?: string;
  brands?: string;
  nutriments?: OffNutriments;
};

/** Converte a resposta do OFF (api/v2/product) no formato do app. Null se inutilizável. */
export function mapOpenFoodFacts(json: unknown): BarcodeProduct | null {
  const product = (json as { status?: number; product?: OffProduct })?.product;
  if (!product) return null;
  const n = product.nutriments ?? {};
  const kcal = Number(n["energy-kcal_100g"]);
  if (!Number.isFinite(kcal) || kcal <= 0) return null;
  const num = (v: unknown) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : 0);
  const name = String(product.product_name ?? "").trim() || String(product.brands ?? "").trim();
  if (!name) return null;
  return {
    name: name.slice(0, 80),
    kcal: Math.round(Math.min(kcal, 900)),
    protein: +num(n.proteins_100g).toFixed(1),
    carbs: +num(n.carbohydrates_100g).toFixed(1),
    fat: +num(n.fat_100g).toFixed(1),
    fiber: +num(n.fiber_100g).toFixed(1),
  };
}
