import { FOOD_MAP, Food, foodAllowed, macrosFor, bestPortion } from "./foods";
import { Profile, Targets, mealsFor, MEALS, hashSeed, rng } from "./calc";

export type PlanItem = {
  foodKey: string;
  name: string;
  grams: number;
  portion: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

export type Macro = { kcal: number; protein: number; carbs: number; fat: number; fiber: number };

export type PlanMeal = {
  meal: string;
  label: string;
  emoji: string;
  target: Macro;
  items: PlanItem[];
  totals: Macro;
};

const SPLITS: Record<number, number[]> = {
  3: [0.3, 0.4, 0.3],
  4: [0.25, 0.35, 0.15, 0.25],
  5: [0.2, 0.1, 0.3, 0.15, 0.25],
  6: [0.2, 0.1, 0.27, 0.13, 0.22, 0.08],
};

type Slot = "protein" | "carb" | "legume" | "veg" | "veg2" | "fruit" | "fat" | "drink";

const CANDIDATES: Record<string, Partial<Record<Slot, string[]>>> = {
  cafe: {
    protein: ["ovo", "iogurte_grego", "cottage", "whey", "minas_frescal", "ricota", "clara", "omelete"],
    carb: ["pao_integral", "aveia", "tapioca", "cuscuz", "batata_doce", "pao_frances"],
    fruit: ["banana", "mamao", "morango", "maca", "kiwi", "mirtilo", "manga"],
    fat: ["pasta_amendoim", "abacate", "castanha_para", "chia", "amendoa", "linhaca"],
    drink: ["cafe"],
  },
  lanche: {
    protein: ["iogurte_natural", "iogurte_grego", "whey", "cottage", "ovo", "barra_proteina"],
    fruit: ["maca", "banana", "morango", "pera", "laranja", "kiwi", "abacaxi", "uva", "mamao"],
    fat: ["castanha_caju", "amendoa", "nozes", "castanha_para", "amendoim", "chia"],
  },
  principal: {
    protein: ["frango_peito", "patinho", "tilapia", "salmao", "contrafile", "lombo", "frango_coxa", "file_mignon", "atum", "camarao", "ovo", "tofu", "pts"],
    carb: ["arroz_integral", "batata_doce", "arroz_branco", "mandioca", "quinoa", "inhame", "macarrao", "batata", "cuscuz"],
    legume: ["feijao_carioca", "feijao_preto", "lentilha", "grao_de_bico"],
    veg: ["brocolis", "abobrinha", "couve_flor", "vagem", "cenoura", "berinjela", "abobora", "couve", "espinafre", "beterraba", "cogumelo"],
    veg2: ["salada_mista", "alface", "rucula", "tomate", "pepino"],
    fat: ["azeite"],
  },
  ceia: {
    protein: ["cottage", "iogurte_natural", "ricota", "ovo", "whey", "iogurte_grego"],
    fat: ["castanha_para", "nozes", "amendoa", "chia"],
  },
};

const LOWCARB_FRUITS = ["morango", "mirtilo", "kiwi", "abacate"];
const LOWCARB_CARBS = ["batata_doce", "abobora", "inhame", "quinoa"];
const VEGAN_PROTEINS = ["tofu", "pts", "lentilha", "grao_de_bico"];
const HIGH_CARB_PROTEINS = ["lentilha", "grao_de_bico", "hummus", "barra_proteina", "pts"];

function templateOf(meal: string) {
  if (meal === "cafe") return "cafe";
  if (meal === "almoco" || meal === "jantar") return "principal";
  if (meal === "ceia") return "ceia";
  return "lanche";
}

function healthAllowed(food: Food, p: Profile) {
  if (p.healthConditions.includes("diabetes") && food.gi === "alto") return false;
  if (p.healthConditions.includes("hipertensao") && food.sodium === "alto") return false;
  if (p.healthConditions.includes("colesterol") && ["manteiga", "lombo", "frango_coxa"].includes(food.key)) return false;
  // Gestantes: evitar embutidos e limitar atum (mercúrio)
  if (p.healthConditions.includes("gestante") && ["peito_peru", "atum"].includes(food.key)) return false;
  return true;
}

function roundGrams(food: Food, g: number) {
  const unit = food.portions.find((pp) => /unidade|scoop|barra|fatia|filé|clara|omelete|tapioca/i.test(pp.l));
  if (unit && unit.g >= 15 && ["ovo", "clara", "whey", "barra_proteina", "pao_integral", "pao_frances", "omelete", "tapioca", "banana", "maca", "pera", "laranja", "kiwi"].includes(food.key)) {
    return Math.max(unit.g, Math.round(g / unit.g) * unit.g);
  }
  if (g < 20) return Math.max(Math.round(g), 1);
  return Math.round(g / 5) * 5;
}

function makeItem(food: Food, grams: number): PlanItem {
  const m = macrosFor(food, grams);
  return { foodKey: food.key, name: food.name, grams, portion: bestPortion(food, grams), ...m };
}

function sum(items: { kcal: number; protein: number; carbs: number; fat: number; fiber: number }[]): Macro {
  return items.reduce(
    (a, i) => ({
      kcal: a.kcal + i.kcal,
      protein: +(a.protein + i.protein).toFixed(1),
      carbs: +(a.carbs + i.carbs).toFixed(1),
      fat: +(a.fat + i.fat).toFixed(1),
      fiber: +(a.fiber + i.fiber).toFixed(1),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );
}

export function generateMealPlan(p: Profile, t: Targets, seed: string, overrides: Record<string, number> = {}): PlanMeal[] {
  const meals = mealsFor(p.mealsPerDay);
  const split = SPLITS[meals.length] ?? SPLITS[5];
  const filter = { diet: p.diet, restrictions: p.restrictions, dislikes: p.dislikes };
  const used = new Set<string>();

  return meals.map((meal, idx) => {
    const share = split[idx];
    const target: Macro = {
      kcal: Math.round(t.kcal * share),
      protein: Math.round(t.protein * share),
      carbs: Math.round(t.carbs * share),
      fat: Math.round(t.fat * share),
      fiber: Math.round(t.fiber * share),
    };
    const rand = rng(hashSeed(`${seed}|${meal}|${overrides[meal] ?? 0}`));
    const tpl = { ...CANDIDATES[templateOf(meal)] };

    // Ajustes por dieta
    if (p.diet === "vegano") tpl.protein = [...new Set([...(tpl.protein ?? []), ...VEGAN_PROTEINS])];
    if (p.carbApproach !== "equilibrado") {
      tpl.fruit = (tpl.fruit ?? []).filter((k) => LOWCARB_FRUITS.includes(k));
      tpl.carb = p.carbApproach === "cetogenica" ? [] : (tpl.carb ?? []).filter((k) => LOWCARB_CARBS.includes(k));
      if (p.carbApproach === "cetogenica") tpl.legume = [];
      if (meal === "cafe" && p.carbApproach === "lowcarb") tpl.carb = [];
      const lowCarbProteins = (tpl.protein ?? []).filter((k) => !HIGH_CARB_PROTEINS.includes(k) || (k === "pts" && p.carbApproach === "lowcarb"));
      if (lowCarbProteins.length) tpl.protein = lowCarbProteins;
    }
    if (meal === "jantar") tpl.legume = p.diet === "vegano" ? tpl.legume : [];

    const pick = (slot: Slot): Food | null => {
      const list = (tpl[slot] ?? [])
        .map((k) => FOOD_MAP[k])
        .filter((f): f is Food => !!f && foodAllowed(f, filter) && healthAllowed(f, p));
      if (!list.length) return null;
      const fresh = list.filter((f) => !used.has(f.key));
      const pool = fresh.length ? fresh : list;
      const f = pool[Math.floor(rand() * pool.length)];
      used.add(f.key);
      return f;
    };

    const items: PlanItem[] = [];
    const cur = () => sum(items);

    const drink = pick("drink");
    if (drink) items.push(makeItem(drink, 150));

    const veg = pick("veg");
    if (veg) items.push(makeItem(veg, roundGrams(veg, p.carbApproach === "equilibrado" ? 90 : 140)));
    const veg2 = pick("veg2");
    if (veg2) items.push(makeItem(veg2, roundGrams(veg2, 80)));

    const fruit = pick("fruit");
    if (fruit) {
      const g = Math.min(fruit.portions[0].g, Math.max(60, ((target.carbs * 0.45) / Math.max(fruit.c, 1)) * 100));
      items.push(makeItem(fruit, roundGrams(fruit, g)));
    }

    const legume = pick("legume");
    if (legume) items.push(makeItem(legume, 85));

    const prot = pick("protein");
    if (prot) {
      const need = Math.max(target.protein - cur().protein, 5);
      let g = (need / Math.max(prot.p, 1)) * 100;
      const max = prot.key === "whey" ? 45 : ["ovo", "omelete"].includes(prot.key) ? 150 : ["ricota", "minas_frescal"].includes(prot.key) ? 120 : prot.key === "clara" ? 200 : prot.key === "pts" ? 50 : prot.role === "dairy" ? 250 : prot.role === "legume" || prot.c > 10 ? 180 : 260;
      const kcalCap = ((target.kcal * 0.6) / Math.max(prot.kcal, 1)) * 100;
      g = Math.min(Math.max(Math.min(g, kcalCap), 30), max);
      items.push(makeItem(prot, roundGrams(prot, g)));
    }

    const carb = pick("carb");
    if (carb) {
      const need = target.carbs - cur().carbs;
      const g = Math.min((need / Math.max(carb.c, 1)) * 100, 320);
      if (g >= 25) items.push(makeItem(carb, roundGrams(carb, g)));
    }

    const fat = pick("fat");
    if (fat) {
      const need = target.fat - cur().fat;
      const max = fat.key === "abacate" ? 120 : fat.key === "azeite" ? 13 : 30;
      const g = Math.min((need / Math.max(fat.f, 1)) * 100, max);
      if (g >= 3) items.push(makeItem(fat, roundGrams(fat, g)));
    }

    return {
      meal,
      label: MEALS[meal].label,
      emoji: MEALS[meal].emoji,
      target,
      items,
      totals: sum(items),
    };
  });
}
