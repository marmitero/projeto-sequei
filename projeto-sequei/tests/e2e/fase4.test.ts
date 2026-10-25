// E2E da Fase 4 (escala): receitas da comunidade, planos compartilhados e ajuste de metas.
// Requer servidor em execução (npm run build && npm start).
import { describe, expect, it } from "vitest";
import { callAction, cookieFrom, get, profileBase, BASE } from "./helpers";

describe("fase 4 — escala", () => {
  const RUN = Date.now(); // nomes únicos por execução (o feed é global)
  let cookie = "";
  let recipeId = 0;
  let shareId = 0;
  let shareToken = "";

  it("setup: perfil pronto", async () => {
    const p = await callAction("/onboarding", "saveProfile", [{ ...profileBase, name: "Fase4 E2E" }]);
    expect(p.status).toBe(200);
    cookie = cookieFrom(p)!;
    expect(cookie).toBeTruthy();
  });

  it("comunidade: publicar, curtir e excluir receita", async () => {
    const s = await callAction("/comunidade", "submitCommunityRecipe", [
      {
        name: `Omelete Fase4 ${RUN}`,
        description: "Proteica e rápida",
        ingredientsText: "Ovo — 3 un\nQueijo — 30 g",
        steps: "Bata e frite.",
        tagsText: "low-carb, jantar",
        kcal: 280,
        protein: 22,
        carbs: 2,
        fat: 20,
      },
    ], cookie);
    expect(s.body).toContain('"ok":true');
    const m = s.body.match(/"ok":true,"id":(\d+)/);
    expect(m).toBeTruthy();
    recipeId = Number(m![1]);

    const page = await get("/comunidade", cookie);
    expect(page.status).toBe(200);
    expect(page.body).toContain(`Omelete Fase4 ${RUN}`);
    // SSR separa texto e interpolação com <!-- -->; o nome aparece como nó próprio
    expect(page.body).toContain("Fase4 E2E");

    const like = await callAction("/comunidade", "toggleCommunityLike", [recipeId], cookie);
    expect(like.body).toContain('"liked":true');
    const unlike = await callAction("/comunidade", "toggleCommunityLike", [recipeId], cookie);
    expect(unlike.body).toContain('"liked":false');

    const del = await callAction("/comunidade", "deleteCommunityRecipe", [recipeId], cookie);
    expect(del.body).toContain('"ok":true');
    const after = await get("/comunidade", cookie);
    expect(after.body).not.toContain(`Omelete Fase4 ${RUN}`);
  });

  it("comunidade: receita de terceiro não pode ser excluída", async () => {
    // segundo usuário publica
    const p2 = await callAction("/onboarding", "saveProfile", [{ ...profileBase, name: "Outra Pessoa" }]);
    const cookie2 = cookieFrom(p2)!;
    const s = await callAction("/comunidade", "submitCommunityRecipe", [
      { name: `Receita Alheia ${RUN}`, kcal: 100 },
    ], cookie2);
    const m = s.body.match(/"ok":true,"id":(\d+)/);
    const foreignId = Number(m![1]);

    // primeiro usuário tenta excluir (não deve sumir)
    await callAction("/comunidade", "deleteCommunityRecipe", [foreignId], cookie);
    const page = await get("/comunidade", cookie);
    expect(page.body).toContain(`Receita Alheia ${RUN}`);
  });

  it("planos compartilhados: criar link, página pública e revogar", async () => {
    const c = await callAction("/perfil", "createShare", ["Nutricionista E2E"], cookie);
    expect(c.body).toContain('"ok":true');
    const m = c.body.match(/"token":"([a-f0-9]{32})"/);
    expect(m).toBeTruthy();
    shareToken = m![1];
    shareId = Number((c.body.match(/"id":(\d+)/) ?? [])[1]);
    expect(shareId).toBeGreaterThan(0);

    // página pública sem cookie — somente leitura
    const pub = await get(`/compartilhar/${shareToken}`);
    expect(pub.status).toBe(200);
    expect(pub.body).toContain("Fase4 E2E");
    expect(pub.body).toContain("somente leitura");
    expect(pub.body).toContain("Plano de treino da semana");
    expect(pub.body).toContain("Nutricionista E2E");

    // revogar → 404
    const r = await callAction("/perfil", "revokeShare", [shareId], cookie);
    expect(r.body).toContain('"ok":true');
    const after = await get(`/compartilhar/${shareToken}`);
    expect(after.status).toBe(404);
  });

  it("ajuste de metas: recomendações no dashboard e aplicar/restaurar", async () => {
    const page = await get("/metricas", cookie);
    expect(page.status).toBe(200);
    expect(page.body).toContain("Ajuste inteligente de metas");
    expect(page.body).not.toContain("Restaurar metas automáticas");

    const apply = await callAction("/metricas", "applyTargetOverrides", [{ kcal: 2100 }], cookie);
    expect(apply.body).toContain('"ok":true');

    const withOverride = await get("/metricas", cookie);
    expect(withOverride.body).toContain("Restaurar metas automáticas");

    const clear = await callAction("/metricas", "clearTargetOverrides", [], cookie);
    expect(clear.body).toContain('"ok":true');
    const restored = await get("/metricas", cookie);
    expect(restored.body).not.toContain("Restaurar metas automáticas");
  });

  it("comunidade aparece na navegação", async () => {
    const home = await get("/", cookie);
    expect(home.body).toContain("/comunidade");
  });

  it("limpeza: receita alheia não importa, nada a fazer", async () => {
    expect(shareToken).toHaveLength(32);
  });
});
