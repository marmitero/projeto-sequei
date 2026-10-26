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
