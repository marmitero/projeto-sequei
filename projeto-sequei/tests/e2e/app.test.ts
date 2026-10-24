// E2E dos fluxos principais — requer servidor em execução (ver npm run test:e2e).
import { describe, expect, it } from "vitest";
import { BASE, callAction, cookieFrom, get, profileBase } from "./helpers";

const today = new Date().toISOString().slice(0, 10);
let cookie = "";

describe("fluxos principais (server actions via HTTP)", () => {
  it("health check responde ok", async () => {
    const r = await get("/api/health");
    expect(r.status).toBe(200);
    expect(r.body).toContain('"ok":true');
  });

  it("sem cookie, / redireciona para /onboarding (307)", async () => {
    const r = await get("/");
    expect(r.status).toBe(307);
    expect(r.location).toContain("/onboarding");
  });

  it("onboarding renderiza o wizard", async () => {
    const r = await get("/onboarding");
    expect(r.status).toBe(200);
    expect(r.body).toContain("Vamos montar seu plano");
  });

  it("saveProfile cria perfil e devolve cookie", async () => {
    const r = await callAction("/onboarding", "saveProfile", [profileBase]);
    expect(r.status).toBe(200);
    const c = cookieFrom(r);
    expect(c).toBeTruthy();
    cookie = c!;
  });

  it("dashboard renderiza com dados do perfil", async () => {
    const r = await get("/", cookie);
    expect(r.status).toBe(200);
    expect(r.body).toContain("Teste E2E");
    expect(r.body).toContain("kcal restantes");
  });

  it("addFoodEntries: alimento da base aparece no diário", async () => {
    const r = await callAction("/alimentacao", "addFoodEntries", [[{ date: today, meal: "cafe", foodKey: "ovo", grams: 100, portionLabel: "2 unidades" }]], cookie);
    expect(r.status).toBe(200);
    const page = await get("/alimentacao", cookie);
    expect(page.body).toContain("Ovo cozido");
  });

  it("addFoodEntries: receita e item manual", async () => {
    const r1 = await callAction("/alimentacao", "addFoodEntries", [[{ date: today, meal: "jantar", recipeKey: "pizza_frango", servings: 1 }]], cookie);
    expect(r1.status).toBe(200);
    const r2 = await callAction("/alimentacao", "addFoodEntries", [[{ date: today, meal: "almoco", custom: { name: "Marmita caseira", kcal: 520, protein: 32, carbs: 55, fat: 14, fiber: 6 }, grams: 350 }]], cookie);
    expect(r2.status).toBe(200);
  });

  it("addFoodEntries rejeita foodKey inexistente", async () => {
    const r = await callAction("/alimentacao", "addFoodEntries", [[{ date: today, meal: "cafe", foodKey: "inexistente" }]], cookie);
    expect(r.status).toBe(500);
  });

  it("addWater registra e reflete na hidratação", async () => {
    const r = await callAction("/hidratacao", "addWater", [today, 250], cookie);
    expect(r.status).toBe(200);
    const page = await get("/hidratacao", cookie);
    expect(page.status).toBe(200);
  });

  it("logWorkout aparece no histórico", async () => {
    const r = await callAction("/exercicios", "logWorkout", [{ date: today, title: "Full body A", kind: "forca", durationMin: 55, kcal: 320, effort: 7, exercises: [{ name: "Agachamento livre (peso corporal)", sets: 3, reps: "12–15", done: true }], notes: "Bom treino" }], cookie);
    expect(r.status).toBe(200);
    const page = await get("/exercicios", cookie);
    expect(page.body).toContain("Full body A");
  });

  it("saveMetric faz upsert no mesmo dia e atualiza o peso do perfil", async () => {
    const r1 = await callAction("/metricas", "saveMetric", [{ date: today, weightKg: 71.8, waistCm: 82, neckCm: 34, hipCm: 98, sleepHours: 7.5, notes: "pesagem matinal" }], cookie);
    expect(r1.status).toBe(200);
    const r2 = await callAction("/metricas", "saveMetric", [{ date: today, weightKg: 71.5, waistCm: 82, neckCm: 34, hipCm: 98 }], cookie);
    expect(r2.status).toBe(200);
    const page = await get("/metricas", cookie);
    expect(page.body).toMatch(/71[,.,]5/);
    const dash = await get("/", cookie);
    expect(dash.body).toMatch(/71[,.,]5/);
  });

  it("demais páginas respondem 200", async () => {
    for (const p of ["/receitas", "/tabela", "/perfil", "/alimentacao?d=2026-10-23"]) {
      const r = await get(p, cookie);
      expect(r.status, p).toBe(200);
    }
  });

  it("addWater ignora data inválida com segurança", async () => {
    const r = await callAction("/hidratacao", "addWater", ["31/12/2026", 250], cookie);
    expect(r.status).toBe(200);
  });

  it("saveProfile com enums inválidos cai nos padrões", async () => {
    const r = await callAction("/onboarding", "saveProfile", [{ ...profileBase, goal: "invalido", pace: "??", diet: "xyz", equipment: ["bazooka", "halteres"], wakeTime: "99:99" }]);
    expect(r.status).toBe(200);
    const page = await get("/", cookieFrom(r) ?? cookie);
    expect(page.body).toContain("Emagrecer");
  });

  it("404 customizado", async () => {
    const r = await get("/rota-que-nao-existe");
    expect(r.status).toBe(404);
    expect(r.body).toContain("não encontrada");
  });

  it("resetAccount limpa tudo e redireciona ao onboarding", async () => {
    const r = await callAction("/perfil", "resetAccount", [], cookie);
    expect(r.status).toBe(200);
    const page = await get("/", cookie);
    expect(page.status).toBe(307);
    expect(page.location).toContain("/onboarding");
  });

  it("action sem cookie é rejeitada", async () => {
    const r = await callAction("/hidratacao", "addWater", [today, 250]);
    expect(r.status).toBe(500);
  });

  it("export exige sessão (401 sem cookie)", async () => {
    const r = await fetch(`${BASE}/api/export?format=json`, { redirect: "manual" });
    expect(r.status).toBe(401);
  });
});
