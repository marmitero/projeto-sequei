// E2E de conta: registro (com claim do perfil anônimo), login multi-dispositivo,
// logout, export/import e rate limiting — requer servidor em execução.
import { describe, expect, it } from "vitest";
import { BASE, callAction, cookieFrom, get, profileBase } from "./helpers";

const uniq = () => `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@teste.app`;
const today = new Date().toISOString().slice(0, 10);

describe("conta, backup e segurança", () => {
  const email = uniq();
  const senha = "senha-forte-123";
  let session = ""; // apenas o cookie de sessão (sem fituid)
  let fituid = "";

  it("registro cria conta e reivindica o perfil anônimo deste navegador", async () => {
    // perfil anônimo primeiro (como o usuário faria)
    const p = await callAction("/onboarding", "saveProfile", [{ ...profileBase, name: "Perfil Anonimo" }]);
    expect(p.status).toBe(200);
    fituid = cookieFrom(p)!;
    expect(fituid).toBeTruthy();

    const r = await callAction("/cadastro", "registerAccount", [email, senha], fituid);
    expect(r.status).toBe(200);
    expect(r.body).toContain('"ok":true');
    const sess = cookieFrom(r, "fit_session");
    expect(sess).toBeTruthy();
    session = sess!;

    // mesmo só com o cookie de sessão, o perfil reivindicado aparece
    const page = await get("/", session);
    expect(page.status).toBe(200);
    expect(page.body).toContain("Perfil Anonimo");
  });

  it("perfil mostra estado conectado", async () => {
    const page = await get("/perfil", session);
    expect(page.status).toBe(200);
    expect(page.body).toContain(email);
    expect(page.body).toContain("Sair da conta");
  });

  it("e-mail duplicado é rejeitado", async () => {
    const r = await callAction("/cadastro", "registerAccount", [email, "outra-senha-123"]);
    expect(r.body).toContain("já cadastrado");
  });

  it("senha curta é rejeitada", async () => {
    const r = await callAction("/cadastro", "registerAccount", [uniq(), "123"]);
    expect(r.body).toContain("8 caracteres");
  });

  it("login com senha errada é rejeitado", async () => {
    const r = await callAction("/login", "loginAccount", [email, "senha-errada-999"]);
    expect(r.body).toContain("incorretos");
  });

  it("login em outro dispositivo recupera o mesmo perfil (só com sessão)", async () => {
    const r = await callAction("/login", "loginAccount", [email, senha]);
    expect(r.body).toContain('"ok":true');
    const sess = cookieFrom(r, "fit_session");
    expect(sess).toBeTruthy();
    const page = await get("/", sess!); // sem fituid — resolução via conta
    expect(page.status).toBe(200);
    expect(page.body).toContain("Perfil Anonimo");
  });

  it("export JSON entrega perfil e histórico", async () => {
    const res = await fetch(`${BASE}/api/export?format=json`, { headers: { Cookie: session } });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain("fitvida-backup");
    const data = (await res.json()) as { app: string; profile: { name: string }; foodLogs: unknown[]; metrics: unknown[] };
    expect(data.app).toBe("fitvida");
    expect(data.profile.name).toBe("Perfil Anonimo");
    expect(Array.isArray(data.foodLogs)).toBe(true);
  });

  it("export CSV por tipo", async () => {
    const res = await fetch(`${BASE}/api/export?format=csv&type=metrics`, { headers: { Cookie: session } });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    const text = await res.text();
    expect(text.split("\n")[0]).toContain("weight_kg");
    const bad = await fetch(`${BASE}/api/export?format=csv&type=inexistente`, { headers: { Cookie: session } });
    expect(bad.status).toBe(400);
  });

  it("importData restaura registros do backup", async () => {
    const r = await callAction(
      "/perfil",
      "importData",
      [
        {
          foodLogs: [{ date: today, meal: "ceia", name: "Iogurte importado", grams: 170, kcal: 87, protein: 7, carbs: 3.2, fat: 5.1 }],
          waterLogs: [{ date: today, ml: 300 }],
          metrics: [{ date: "2026-10-01", weightKg: 73.2 }],
        },
      ],
      session,
    );
    expect(r.status).toBe(200);
    expect(r.body).toContain('"ok":true');
    const page = await get("/alimentacao", session);
    expect(page.body).toContain("Iogurte importado");
  });

  it("logout encerra a sessão", async () => {
    const r = await callAction("/perfil", "logoutAccount", [], session);
    expect(r.status).toBe(200);
    // token revogado: só com fit_session (sem perfil) → redirect
    const only = await get("/", session);
    expect(only.status).toBe(307);
    // o cookie de perfil continua funcionando em modo anônimo
    const anon = await get("/perfil", fituid);
    expect(anon.status).toBe(200);
    expect(anon.body).toContain("Criar conta");
  });

  it("rate limit de login por e-mail", async () => {
    const alvo = uniq();
    // cria a conta para haver o que validar
    await callAction("/cadastro", "registerAccount", [alvo, senha]);
    let blocked = false;
    for (let i = 0; i < 11; i++) {
      const r = await callAction("/login", "loginAccount", [alvo, "senha-errada-999"]);
      if (r.body.includes("Muitas tentativas")) {
        blocked = true;
        break;
      }
    }
    expect(blocked).toBe(true);
  });

  it("rate limit de registro por e-mail", async () => {
    const alvo = uniq();
    const r1 = await callAction("/cadastro", "registerAccount", [alvo, senha]);
    expect(r1.body).toContain('"ok":true');
    let blocked = false;
    for (let i = 0; i < 3; i++) {
      const r = await callAction("/cadastro", "registerAccount", [alvo, senha]);
      if (r.body.includes("Muitas tentativas")) {
        blocked = true;
        break;
      }
    }
    expect(blocked).toBe(true);
  });

  it("resetAccount apaga dados de conta logada", async () => {
    const email2 = uniq();
    const r = await callAction("/cadastro", "registerAccount", [email2, senha]);
    const sess = cookieFrom(r, "fit_session")!;
    await callAction("/onboarding", "saveProfile", [{ ...profileBase, name: "Apagar Depois" }], sess);
    const del = await callAction("/perfil", "resetAccount", [], sess);
    expect(del.status).toBe(200);
    const page = await get("/", sess);
    expect(page.status).toBe(307);
    expect(page.location).toContain("/onboarding");
  });
});
