import { describe, expect, it } from "vitest";
import { FOOD_MAP } from "../../src/lib/foods";
import { RECIPES, recipeNutrition, recipeCompatibility, recipeAllergens } from "../../src/lib/recipes";

describe("recipes", () => {
  it("nutrição calculada ingrediente a ingrediente", () => {
    expect(RECIPES.length).toBeGreaterThanOrEqual(15);
    for (const r of RECIPES) {
      const n = recipeNutrition(r);
      expect(n.kcal).toBeGreaterThan(0);
      expect(n.gramsPerServing).toBeGreaterThan(0);
      for (const ing of r.ingredients) {
        if (ing.key) expect(FOOD_MAP[ing.key], `ingrediente ${ing.key} em ${r.key}`).toBeTruthy();
      }
    }
  });

  it("compatibilidade com dieta e restrições", () => {
    const r = RECIPES.find((x) => x.key === "pizza_frango")!;
    expect(recipeCompatibility(r, "onivoro", [], "").ok).toBe(true);
    const veg = recipeCompatibility(r, "vegano", [], "");
    expect(veg.ok).toBe(false);
    expect(veg.reasons.length).toBeGreaterThan(0);
    const lac = recipeCompatibility(r, "onivoro", ["lactose"], "");
    expect(lac.ok).toBe(false);
    expect(recipeAllergens(r)).toContain("lac");
  });

  it("aversão textual bloqueia receita", () => {
    const r = RECIPES.find((x) => x.key === "pizza_frango")!;
    expect(recipeCompatibility(r, "onivoro", [], "frango").ok).toBe(false);
  });
});
