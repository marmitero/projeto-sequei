// E2E da Fase 3 (engajamento): fotos de progresso, import de saúde, PWA e gamificação.
// Requer servidor em execução (npm run build && npm start).
import { describe, expect, it } from "vitest";
import { callAction, cookieFrom, get, profileBase, BASE } from "./helpers";

const today = new Date().toISOString().slice(0, 10);
const addDays = (n: number) => {
  const d = new Date(today + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// 1x1 PNG
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

describe("fase 3 — engajamento", () => {
  let cookie = "";

  it("setup: perfil pronto", async () => {
    const p = await callAction("/onboarding", "saveProfile", [{ ...profileBase, name: "Fase3 E2E" }]);
    expect(p.status).toBe(200);
    cookie = cookieFrom(p)!;
    expect(cookie).toBeTruthy();
  });

  it("fotos: upload, lista, download e exclusão", async () => {
    const fd = new FormData();
    fd.set("file", new Blob([PNG], { type: "image/png" }), "foto.png");
    fd.set("date", today);
    fd.set("label", "frente");
    const up = await fetch(`${BASE}/api/photos`, { method: "POST", body: fd, headers: { cookie } });
    expect(up.status).toBe(200);
    const { id } = await up.json();
    expect(id).toBeGreaterThan(0);

    const list = await (await fetch(`${BASE}/api/photos`, { headers: { cookie } })).json();
    expect(list.photos).toHaveLength(1);
    expect(list.photos[0].label).toBe("frente");

    const img = await fetch(`${BASE}/api/photos/${id}`, { headers: { cookie } });
    expect(img.status).toBe(200);
    expect(img.headers.get("content-type")).toBe("image/png");

    const del = await fetch(`${BASE}/api/photos/${id}`, { method: "DELETE", headers: { cookie } });
    expect(del.status).toBe(200);
    const after = await fetch(`${BASE}/api/photos/${id}`, { headers: { cookie } });
    expect(after.status).toBe(404);
  });

  it("import de saúde: CSV de peso vira métricas por data", async () => {
    const csv = ["Date,Weight (kg)", `${addDays(-2)},73.5`, `${addDays(-1)},72.9`].join("\n");
    const fd = new FormData();
    fd.set("file", new Blob([csv], { type: "text/csv" }), "pesos.csv");
    const r = await fetch(`${BASE}/api/health-import`, { method: "POST", body: fd, headers: { cookie } });
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.days).toBe(2);
    expect(j.weights).toBe(2);

    // confere nas métricas renderizadas (gráfico de peso embute os dados)
    const page = await get("/metricas", cookie);
    expect(page.status).toBe(200);
    expect(page.body).toContain("73.5");
    expect(page.body).toContain("72.9");
  });

  it("PWA: manifest, service worker e ícone servidos", async () => {
    const m = await get("/manifest.webmanifest");
    expect(m.status).toBe(200);
    expect(m.body).toContain('"display": "standalone"');

    const sw = await get("/sw.js");
    expect(sw.status).toBe(200);
    expect(sw.body).toContain("fitvida-v1");

    const icon = await fetch(`${BASE}/icon.png`);
    expect(icon.status).toBe(200);
    expect(icon.headers.get("content-type")).toContain("image/png");
  });

  it("modo escuro: script anti-FOUC presente e gamificação no dashboard", async () => {
    const home = await get("/", cookie);
    expect(home.status).toBe(200);
    expect(home.body).toContain("fitvida-theme"); // pré-paint do tema
    expect(home.body).toContain("Sequências e marcos");
    expect(home.body).toContain("Constância");
  });

  it("lembretes: perfil alimenta a agenda (dias e horários)", async () => {
    // o ReminderToggle recebe wakeTime 06:30 / sleepTime 22:30 do perfil — botão renderiza
    const home = await get("/", cookie);
    expect(home.body).toContain("Ativar lembretes");
  });
});
