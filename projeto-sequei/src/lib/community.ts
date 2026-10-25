// Validação/normalização de receitas da comunidade — função pura.
export type RecipeInput = {
  name: string;
  description?: string;
  ingredientsText?: string; // uma linha por item: "Frango grelhado — 150 g" ou "Frango, 150"
  steps?: string;
  tagsText?: string; // "low-carb, jantar"
  kcal: number;
  protein?: number;
  carbs?: number;
  fat?: number;
};

export type NormalizedRecipe = {
  name: string;
  description: string;
  ingredients: { name: string; grams: number }[];
  steps: string;
  tags: string[];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

/** "Frango grelhado — 150 g" / "Arroz, 200" / "Ovo 2 un" → { name, grams }. */
export function parseIngredientLine(line: string): { name: string; grams: number } | null {
  const clean = line.trim().replace(/\.$/, "");
  if (!clean) return null;
  const m = /^(.+?)\s*(?:[—–\-:,]\s*|\s+)(\d+(?:[.,]\d+)?)\s*(g|gr|gramas?|ml|un|unidades?)?/i.exec(clean);
  if (!m) return { name: clean.slice(0, 60), grams: 0 };
  return { name: m[1].trim().slice(0, 60), grams: Math.round(Number(m[2].replace(",", "."))) };
}

export function normalizeRecipeInput(input: RecipeInput): NormalizedRecipe | { error: string } {
  const name = (input.name ?? "").trim();
  if (name.length < 3) return { error: "O nome da receita precisa de pelo menos 3 caracteres." };
  if (name.length > 80) return { error: "Nome muito longo (máx. 80 caracteres)." };
  const kcal = Number(input.kcal);
  if (!Number.isFinite(kcal) || kcal <= 0 || kcal > 5000) return { error: "Informe as calorias da porção (1–5000 kcal)." };
  const n = (v: unknown) => {
    const x = Number(v);
    return Number.isFinite(x) && x >= 0 && x <= 1000 ? x : 0;
  };

  const ingredients = (input.ingredientsText ?? "")
    .split(/\r?\n/)
    .map(parseIngredientLine)
    .filter((x): x is { name: string; grams: number } => x != null)
    .slice(0, 30);

  const tags = (input.tagsText ?? "")
    .split(/[,;]/)
    .map((t) => t.trim().toLowerCase().slice(0, 24))
    .filter(Boolean)
    .slice(0, 6);

  return {
    name,
    description: (input.description ?? "").trim().slice(0, 280),
    ingredients,
    steps: (input.steps ?? "").trim().slice(0, 4000),
    tags,
    kcal: Math.round(kcal),
    protein: n(input.protein),
    carbs: n(input.carbs),
    fat: n(input.fat),
  };
}
