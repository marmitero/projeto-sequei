// E2E das funcionalidades da Fase 2: meus alimentos, favoritos, repetir refeição,
// código de barras (degradação graciosa), lista de compras, progressão e relatório.
// Requer servidor em execução (npm run build && npm start).
import { describe, expect, it } from "vitest";
import { callAction, cookieFrom, get, profileBase } from "./helpers";

const today = new Date().toISOString().slice(0, 10);
const addDays = (n: number) => {
  const d = new Date(today + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

describe("biblioteca, atalhos e relatórios", () => {
  let cookie = "";

  it("setup: perfil pronto", async () => {
    const p = await callAction("/onboarding", "saveProfile", [{ ...profileBase, name: "Fase2 E2E" }]);
    expect(p.status).toBe(200);
    cookie = cookieFrom(p)!;
    expect(cookie).toBeTruthy();
  });

  let customId = 0;

  it("meus alimentos: salvar, listar e registrar pelo id", async () => {
    const s = await callAction("/alimentacao", "saveCustomFood", [
      { name: "Whey E2E", grams: 30, portionLabel: "1 dose", kcal: 120, protein: 24, carbs: 3, fat: 1.5, fiber: 0 },
    ], cookie);
    expect(s.body).toContain('"ok":true');
    const m = s.body.match(/"ok":true,"id":(\d+)/);
    expect(m).toBeTruthy();
    customId = Number(m![1]);

    const lib = await callAction("/alimentacao", "listLibrary", [], cookie);
    expect(lib.body).toContain("Whey E2E");

    const a = await callAction("/alimentacao", "addFoodEntries", [[{ date: today, meal: "lanche", customId, servings: 2 }]], cookie);
    expect(a.status).toBe(200);

    const exp = await get("/api/export?format=json", cookie);
    expect(exp.status).toBe(200);
    const foods = (JSON.parse(exp.body) as { foodLogs: { name: string; kcal: number; grams: number }[] }).foodLogs;
    const whey = foods.find((f) => f.name === "Whey E2E");
    expect(whey).toBeTruthy();
    expect(whey!.kcal).toBe(240); // 2 porções
    expect(whey!.grams).toBe(60);
  });

  it("favoritos: marcar, listar e desmarcar", async () => {
    const t1 = await callAction("/alimentacao", "toggleFavorite", ["food", "arroz_branco"], cookie);
    expect(t1.body).toContain('"favorited":true');
    const t2 = await callAction("/alimentacao", "toggleFavorite", ["custom", String(customId)], cookie);
    expect(t2.body).toContain('"favorited":true');

    const lib = await callAction("/alimentacao", "listLibrary", [], cookie);
    expect(lib.body).toContain('"key":"arroz_branco"');
    expect(lib.body).toContain(`"key":"${customId}"`);

    const t3 = await callAction("/alimentacao", "toggleFavorite", ["food", "arroz_branco"], cookie);
    expect(t3.body).toContain('"favorited":false');
    const lib2 = await callAction("/alimentacao", "listLibrary", [], cookie);
    expect(lib2.body).not.toContain('"key":"arroz_branco"');
  });

  it("excluir alimento pessoal remove favorito junto", async () => {
    const d = await callAction("/alimentacao", "deleteCustomFood", [customId], cookie);
    expect(d.status).toBe(200);
    const lib = await callAction("/alimentacao", "listLibrary", [], cookie);
    expect(lib.body).not.toContain("Whey E2E");
    expect(lib.body).not.toContain(`"key":"${customId}"`);
  });

  it("repetir refeição copia os itens de outra data", async () => {
    await callAction("/alimentacao", "addFoodEntries", [[{ date: addDays(-1), meal: "jantar", foodKey: "frango_peito", grams: 150 }]], cookie);
    const c = await callAction("/alimentacao", "copyMeal", [addDays(-1), today, "jantar"], cookie);
    expect(c.body).toContain('"ok":true');
    expect(c.body).toContain('"copied":1');

    const exp = await get("/api/export?format=json", cookie);
    const foods = (JSON.parse(exp.body) as { foodLogs: { date: string; meal: string; name: string }[] }).foodLogs;
    const jantares = foods.filter((f) => f.date === today && f.meal === "jantar");
    expect(jantares).toHaveLength(1);
    expect(jantares[0].name.toLowerCase()).toContain("frango");

    // copiar sem itens de origem não quebra
    const c2 = await callAction("/alimentacao", "copyMeal", [addDays(-5), today, "cafe"], cookie);
    expect(c2.body).toContain('"copied":0');
  });

  it("código de barras: validação e degradação graciosa sem internet", async () => {
    const bad = await callAction("/alimentacao", "lookupBarcode", ["12"], cookie);
    expect(bad.body).toContain("inválido");

    // sandbox sem acesso à Open Food Facts → erro amigável, nunca 500
    const off = await callAction("/alimentacao", "lookupBarcode", ["7891234567895"], cookie);
    expect(off.status).toBe(200);
    expect(off.body).toContain('"ok":false');
    expect(off.body).toContain("indispon");
  });

  it("exercícios: registrar treino com carga e ver progressão", async () => {
    const w = await callAction("/exercicios", "logWorkout", [
      { date: today, title: "Supino E2E", kind: "forca", durationMin: 50, kcal: 300, effort: 8, exercises: [{ name: "Supino reto", sets: 3, reps: "8", load: "40 kg" }] },
    ], cookie);
    expect(w.status).toBe(200);

    const page = await get("/exercicios", cookie);
    expect(page.status).toBe(200);
    expect(page.body).toContain("Progressão de força");
    expect(page.body).toContain("Supino reto");
  });

  it("alimentação mostra o atalho repetir de ontem", async () => {
    const page = await get("/alimentacao", cookie);
    expect(page.status).toBe(200);
    expect(page.body).toContain("Repetir esta refeição de ontem");
    expect(page.body).toContain("Cardápio sugerido");
  });

  it("lista de compras é gerada do cardápio", async () => {
    const page = await get("/compras", cookie);
    expect(page.status).toBe(200);
    expect(page.body).toContain("Lista de compras");
    expect(page.body).toContain("itens para manter");
  });

  it("métricas mostra relatório semanal e tendências", async () => {
    const page = await get("/metricas", cookie);
    expect(page.status).toBe(200);
    expect(page.body).toContain("Relatório semanal");
    expect(page.body).toContain("Tendência de calorias");
    expect(page.body).toContain("Tendência de treinos");
  });

  it("páginas novas exigem sessão", async () => {
    const c = await get("/compras");
    expect(c.status).toBe(307);
    expect(c.location).toMatch(/\/login|\/onboarding/);
    const m = await get("/metricas");
    expect(m.status).toBe(307);
  });
});
