// E2E de i18n: cookie fitvida-lang muda o idioma renderizado (SSR).
// Requer servidor em execução (npm run build && npm start). Idioma padrão: pt.
import { describe, expect, it } from "vitest";
import { callAction, cookieFrom, get, profileBase } from "./helpers";

describe("i18n — cookie fitvida-lang", () => {
  it("/onboarding renderiza nos 5 idiomas conforme o cookie", async () => {
    const pt = await get("/onboarding");
    expect(pt.status).toBe(200);
    expect(pt.body).toContain("Vamos montar seu plano");

    const en = await get("/onboarding", "fitvida-lang=en");
    expect(en.body).toContain("build your plan");
    expect(en.body).not.toContain("Vamos montar seu plano");

    const es = await get("/onboarding", "fitvida-lang=es");
    expect(es.body).toContain("Vamos a crear tu plan");

    const fr = await get("/onboarding", "fitvida-lang=fr");
    expect(fr.body).toContain("Créons votre plan");

    const zh = await get("/onboarding", "fitvida-lang=zh");
    expect(zh.body).toContain("一起来制定你的计划");
  });

  it("cookie inválido cai no pt; shell autenticado traduz com o cookie", async () => {
    const bad = await get("/onboarding", "fitvida-lang=xx");
    expect(bad.body).toContain("Vamos montar seu plano");

    const p = await callAction("/onboarding", "saveProfile", [{ ...profileBase, name: "I18n E2E" }]);
    expect(p.status).toBe(200);
    const cookie = cookieFrom(p)!;
    expect(cookie).toBeTruthy();

    const dashPt = await get("/", cookie);
    expect(dashPt.status).toBe(200);
    expect(dashPt.body).toContain("Peso atual");

    const dashEn = await get("/", `${cookie}; fitvida-lang=en`);
    expect(dashEn.status).toBe(200);
    expect(dashEn.body).toContain("Current weight");
    expect(dashEn.body).not.toContain("Peso atual");

    const dashZh = await get("/", `${cookie}; fitvida-lang=zh`);
    expect(dashZh.status).toBe(200);
    expect(dashZh.body).toContain("当前体重");
  });
});

describe("validação estilo usuário — regressões", () => {
  it("/onboarding tem seleção de idioma e de tema na primeira tela", async () => {
    const res = await get("/onboarding");
    expect(res.status).toBe(200);
    // toggles de idioma e tema presentes na primeira tela
    expect(res.body).toContain("Alterar idioma");
    expect(res.body).toContain("modo escuro");
    // wizard continua na primeira tela
    expect(res.body).toContain("Vamos montar seu plano");
    // mecanismo de tema (localStorage + script anti-FOUC) presente
    expect(res.body).toContain("fitvida-theme");
    expect(res.body).toContain("prefers-color-scheme");
  });

  it("nenhuma chave de i18n crua nem {{ }} cruo nas rotas principais (pt)", async () => {
    const p = await callAction("/onboarding", "saveProfile", [{ ...profileBase, name: "Leak Scan" }]);
    const cookie = cookieFrom(p)!;
    expect(cookie).toBeTruthy();
    const pages = ["/", "/alimentacao", "/hidratacao", "/exercicios", "/metricas", "/compras", "/comunidade", "/familia", "/perfil"];
    const leaked: string[] = [];
    for (const path of pages) {
      const res = await get(path, cookie);
      expect(res.status).toBe(200);
      // remove scripts (flight/props) — só o HTML visível importa
      const html = res.body.replace(/<script[\s\S]*?<\/script>/g, "");
      if (html.includes("{{")) leaked.push(path + ": {{}} crua");
      const m = html.match(/\b(?:wiz|dash|food|add|water|wp|mp|week|photo|coach|recipe|share|comm|fam|acc|health|table|pages|common|nav|goal|meal|act|bmi|note|tip|game|auth|restr|cond|equip|inj|cardio|day|dayShort|climate|loc|exp|carb|carbDesc|diet|prog|shop|nf|err|macro|reset|reminders)\.[A-Za-z]\w+/);
      if (m) leaked.push(path + ": " + m[0]);
    }
    expect(leaked).toEqual([]);
  });

  it("dashboard não exibe chaves de emblemas cruas", async () => {
    const p = await callAction("/onboarding", "saveProfile", [{ ...profileBase, name: "Badge Scan" }]);
    const cookie = cookieFrom(p)!;
    const body = (await get("/", cookie)).body;
    const html = body.replace(/<script[\s\S]*?<\/script>/g, "");
    expect(html).not.toContain("game.badge.");
    expect(html).toContain("Sequências e marcos");
    expect(html).toContain("kcal restantes");
  });
});
