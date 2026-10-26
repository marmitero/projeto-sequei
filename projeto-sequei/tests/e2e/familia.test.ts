// E2E da 2ª leva da Fase 4: grupo de família com conta vinculada (convites por código).
// Requer servidor em execução (npm run build && npm start).
import { describe, expect, it } from "vitest";
import { callAction, cookieFrom, get, profileBase } from "./helpers";

describe("fase 4 — família com conta vinculada", () => {
  let ownerCookie = "";

  it("setup: dono com perfil", async () => {
    const p = await callAction("/onboarding", "saveProfile", [{ ...profileBase, name: "Dona Familia" }]);
    expect(p.status).toBe(200);
    ownerCookie = cookieFrom(p)!;
    expect(ownerCookie).toBeTruthy();
  });

  it("criar grupo, gerar convite e validar código inválido", async () => {
    const c = await callAction("/familia", "createFamily", ["Família E2E"], ownerCookie);
    expect(c.body).toContain('"ok":true');

    const inv = await callAction("/familia", "generateFamilyInvite", [], ownerCookie);
    expect(inv.body).toContain('"ok":true');
    const m = inv.body.match(/"code":"([0-9a-f]{32})"/);
    expect(m).toBeTruthy();

    // segundo usuário tenta código inválido
    const p2 = await callAction("/onboarding", "saveProfile", [{ ...profileBase, name: "Membro E2E" }]);
    const memberCookie = cookieFrom(p2)!;
    const bad = await callAction("/familia", "joinFamily", ["00000000000000000000000000000000"], memberCookie);
    expect(bad.body).toContain('"ok":false');

    // entra com o código válido
    const ok = await callAction("/familia", "joinFamily", [m![1]], memberCookie);
    expect(ok.body).toContain('"ok":true');

    // convite é de uso único
    const again = await callAction("/familia", "joinFamily", [m![1]], memberCookie);
    expect(again.body).toContain('"ok":false');

    // overview do dono mostra os dois membros
    const ov = await callAction("/familia", "familyOverview", [], ownerCookie);
    expect(ov.body).toContain("Dona Familia");
    expect(ov.body).toContain("Membro E2E");
    expect(ov.body).toContain('"role":"owner"');
    expect(ov.body).toContain('"role":"member"');

    // página /familia renderiza o quadro
    const page = await get("/familia", ownerCookie);
    expect(page.status).toBe(200);
    expect(page.body).toContain("Família E2E");
    expect(page.body).toContain("Membro E2E");
  });

  it("permissões: membro não convida nem remove; dono remove; dono não sai", async () => {
    // novo membro para este cenário
    const p3 = await callAction("/onboarding", "saveProfile", [{ ...profileBase, name: "Convidada E2E" }]);
    const guestCookie = cookieFrom(p3)!;
    const inv = await callAction("/familia", "generateFamilyInvite", [], ownerCookie);
    const code = inv.body.match(/"code":"([0-9a-f]{32})"/)![1];
    expect((await callAction("/familia", "joinFamily", [code], guestCookie)).body).toContain('"ok":true');

    // membro não gera convite
    const noInvite = await callAction("/familia", "generateFamilyInvite", [], guestCookie);
    expect(noInvite.body).toContain('"ok":false');
    // membro não remove outro
    const ov = await callAction("/familia", "familyOverview", [], ownerCookie);
    const memberId = ov.body.match(/"userId":"([0-9a-f-]{36})","name":"Membro E2E"/)![1];
    const noRemove = await callAction("/familia", "removeFamilyMember", [memberId], guestCookie);
    expect(noRemove.body).toContain('"ok":false');
    // dono não sai do grupo
    const noLeave = await callAction("/familia", "leaveFamily", [], ownerCookie);
    expect(noLeave.body).toContain('"ok":false');
    // dono remove o membro
    const removed = await callAction("/familia", "removeFamilyMember", [memberId], ownerCookie);
    expect(removed.body).toContain('"ok":true');
    const ov2 = await callAction("/familia", "familyOverview", [], ownerCookie);
    expect(ov2.body).not.toContain("Membro E2E");
    // convidada sai por conta própria
    const left = await callAction("/familia", "leaveFamily", [], guestCookie);
    expect(left.body).toContain('"ok":true');
  });
});
