import { describe, expect, it } from "vitest";
import { FOODS, FOOD_MAP, macrosFor, foodAllowed, bestPortion, searchFoods, allergensOf, originAllowed } from "../../src/lib/foods";

describe("foods", () => {
  it("base íntegra: chaves únicas, valores válidos e porções", () => {
    expect(FOODS.length).toBeGreaterThanOrEqual(100);
    const keys = new Set(FOODS.map((f) => f.key));
    expect(keys.size).toBe(FOODS.length);
    for (const f of FOODS) {
      expect(f.kcal).toBeGreaterThanOrEqual(0);
      expect(f.p).toBeGreaterThanOrEqual(0);
      expect(f.c).toBeGreaterThanOrEqual(0);
      expect(f.f).toBeGreaterThanOrEqual(0);
      expect(f.fib).toBeGreaterThanOrEqual(0);
      expect(f.portions.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("macrosFor proporcional aos gramas", () => {
    const ovo = FOOD_MAP["ovo"];
    const full = macrosFor(ovo, 100);
    expect(Math.abs(full.kcal - ovo.kcal)).toBeLessThan(0.5);
    const half = macrosFor(ovo, 50);
    expect(Math.abs(half.kcal - ovo.kcal / 2)).toBeLessThan(0.5);
  });

  it("filtros de dieta, alergênios e aversões", () => {
    expect(originAllowed("plant", "vegano")).toBe(true);
    expect(originAllowed("meat", "vegano")).toBe(false);
    expect(originAllowed("dairy", "vegetariano")).toBe(true);
    expect(allergensOf(["lactose"])).toContain("lac");
    const milk = FOOD_MAP["leite_integral"];
    expect(foodAllowed(milk, { diet: "onivoro", restrictions: ["lactose"], dislikes: "" })).toBe(false);
    expect(foodAllowed(milk, { diet: "vegano", restrictions: [], dislikes: "" })).toBe(false);
    expect(foodAllowed(FOOD_MAP["frango_peito"], { diet: "onivoro", restrictions: [], dislikes: "frango" })).toBe(false);
    expect(foodAllowed(FOOD_MAP["arroz_branco"], { diet: "vegano", restrictions: ["lactose"], dislikes: "frango" })).toBe(true);
  });

  it("busca com acentos e múltiplos termos", () => {
    expect(searchFoods("frango").length).toBeGreaterThanOrEqual(2);
    expect(searchFoods("pao").length).toBeGreaterThanOrEqual(1);
    expect(searchFoods("peito frango").some((f) => f.key === "frango_peito")).toBe(true);
    expect(searchFoods("inexistente_xyz")).toHaveLength(0);
  });

  it("bestPortion aproxima medida caseira", () => {
    const bp = bestPortion(FOOD_MAP["ovo"], 100);
    expect(bp).toContain("2");
  });
});
