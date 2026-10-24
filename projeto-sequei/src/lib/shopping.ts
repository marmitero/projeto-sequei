// Lista de compras agregada do cardápio sugerido (N dias) — função pura.
import { Food, FOOD_MAP, bestPortion } from "./foods";
import { Profile, Targets } from "./calc";
import { generateMealPlan } from "./mealplan";

export type ShoppingItem = {
  foodKey: string;
  name: string;
  cat: string;
  totalGrams: number;
  portion: string;
  kcal: number;
};

export type ShoppingGroup = { cat: string; items: ShoppingItem[] };

/** Agrega os alimentos do cardápio de `days` dias a partir de `fromDate`. */
export function generateShoppingList(
  p: Profile,
  t: Targets,
  seedBase: string,
  fromDate: string,
  days: number,
): ShoppingGroup[] {
  const totals = new Map<string, number>();
  for (let d = 0; d < days; d++) {
    const date = addDaysISO(fromDate, d);
    const plan = generateMealPlan(p, t, `${seedBase}|${date}`);
    for (const meal of plan) {
      for (const item of meal.items) {
        totals.set(item.foodKey, (totals.get(item.foodKey) ?? 0) + item.grams);
      }
    }
  }
  const groups = new Map<string, ShoppingItem[]>();
  for (const [key, grams] of totals) {
    const f: Food | undefined = FOOD_MAP[key];
    if (!f) continue;
    const totalGrams = grams < 20 ? Math.round(grams) : Math.round(grams / 5) * 5;
    const item: ShoppingItem = {
      foodKey: key,
      name: f.name,
      cat: f.cat,
      totalGrams,
      portion: bestPortion(f, totalGrams) || `${totalGrams} g`,
      kcal: Math.round((f.kcal * totalGrams) / 100),
    };
    const list = groups.get(f.cat) ?? [];
    list.push(item);
    groups.set(f.cat, list);
  }
  return [...groups.entries()]
    .map(([cat, items]) => ({ cat, items: items.sort((a, b) => b.totalGrams - a.totalGrams) }))
    .sort((a, b) => a.cat.localeCompare(b.cat));
}

function addDaysISO(date: string, n: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
