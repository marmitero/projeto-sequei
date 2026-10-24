// E2E do ambiente atrás de reverse proxy (preview): Server Actions devem ser
// aceitas quando Host e Origin divergem (allowlist), cookies de identidade devem
// funcionar em iframe cross-site (SameSite=None; Secure em https) e as actions de
// login/registro devem devolver os tokens para o fallback de document.cookie.
// Requer servidor em execução.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BASE, profileBase } from "./helpers";

function actionId(name: string): string {
  const manifestPath = resolve(process.cwd(), ".next/server/server-reference-manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { node: Record<string, { exportedName: string }> };
  for (const [id, v] of Object.entries(manifest.node)) if (v.exportedName === name) return id;
  throw new Error(`Server action não encontrada: ${name}`);
}

async function post(path: string, name: string, args: unknown[], headers: Record<string, string>) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Next-Action": actionId(name),
      "Content-Type": "text/plain;charset=UTF-8",
      Accept: "text/x-component",
      ...headers,
    },
    body: JSON.stringify(args),
  });
  return { status: res.status, setCookie: res.headers.getSetCookie?.() ?? [], body: await res.text() };
}

describe("proxy reverso (preview) e cookies", () => {
  it("Server Action aceita origin do preview mesmo com Host reescrito pelo proxy", async () => {
    // reproduz o cenário do proxy: Origin https://<host-preview>, Host 127.0.0.1
    const r = await post("/onboarding", "saveProfile", [{ ...profileBase, name: "Proxy E2E" }], {
      Origin: "https://3000-teste.e2b.app",
      Host: "127.0.0.1:3000",
      "X-Forwarded-Proto": "https",
    });
    expect(r.status).toBe(200); // sem a allowlist seria 500 "Invalid Server Actions request"
    expect(r.body).toContain('"ok":true');
  });

  it("cookies de identidade saem com SameSite=None; Secure em requisição https", async () => {
    const r = await post("/onboarding", "saveProfile", [{ ...profileBase, name: "Proxy E2E" }], {
      Origin: "https://3000-teste.e2b.app",
      "X-Forwarded-Proto": "https",
    });
    const fituid = r.setCookie.find((c) => c.startsWith("fituid="));
    expect(fituid).toBeTruthy();
    expect(fituid!.toLowerCase()).toContain("samesite=none");
    expect(fituid!.toLowerCase()).toContain("secure");
  });

  it("registro e login devolvem tokens para o fallback de cookie no cliente", async () => {
    const email = `proxy-${Date.now()}@teste.app`;
    const reg = await post("/cadastro", "registerAccount", [email, "senha-forte-123"], {
      Origin: BASE,
    });
    expect(reg.body).toContain('"ok":true');
    expect(reg.body).toContain('"session":');
    expect(reg.setCookie.some((c) => c.startsWith("fit_session="))).toBe(true);

    const login = await post("/login", "loginAccount", [email, "senha-forte-123"], { Origin: BASE });
    expect(login.body).toContain('"ok":true');
    expect(login.body).toContain('"session":');
  });
});
