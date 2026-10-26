import { describe, expect, it } from "vitest";
import pt from "../../src/lib/messages/pt";
import en from "../../src/lib/messages/en";
import fr from "../../src/lib/messages/fr";
import es from "../../src/lib/messages/es";
import zh from "../../src/lib/messages/zh";
import { DICTS, LOCALES, isLocale, tFor, translate } from "../../src/lib/i18n";

// Chaves efetivamente usadas no código (t("..."), tr("..."), labelKeys de domínio).
const USED_KEYS = [
  // domínio
  "goal.perder","goal.ganhar","goal.manter","goal.recomp",
  "act.sedentario","act.leve","act.moderado","act.intenso","act.atleta",
  "bmi.under","bmi.normal","bmi.over","bmi.ob1","bmi.ob2","bmi.ob3",
  "meal.cafe","meal.lancheManha","meal.almoco","meal.lancheTarde","meal.jantar","meal.ceia",
  "day.mon","day.sun","dayShort.mon","dayShort.sun",
  "equip.halteres","inj.joelho","cardio.caminhada",
  "note.floor","tip.deficit",
  // auth / wizard / dash / etc.
  "auth.loginTitle","auth.signupBtn","wiz.title","wiz.saveChanges",
  "dash.currentWeight","food.remaining","add.search","macro.protein",
  "water.goal","wp.logWorkout","prog.title","mp.date","week.title",
  "photo.title","coach.description","recipe.all","shop.clearChecks",
  "comm.submit","acc.title","health.title","share.title","game.title",
  "nf.title","err.title","pages.foodSub","common.save","nav.home",
];

describe("i18n — paridade de dicionários", () => {
  const dicts = { pt, en, fr, es, zh } as const;
  const base = Object.keys(pt).sort();

  it("todos os idiomas têm exatamente as mesmas chaves que pt", () => {
    for (const [name, d] of Object.entries(dicts)) {
      expect(Object.keys(d).sort(), `chaves de ${name}`).toEqual(base);
    }
  });

  it("nenhuma tradução vazia", () => {
    for (const [name, d] of Object.entries(dicts)) {
      for (const [k, v] of Object.entries(d)) {
        expect(v.length, `${name}.${k}`).toBeGreaterThan(0);
      }
    }
  });

  it("variáveis de interpolação são idênticas entre idiomas", () => {
    const varsOf = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort();
    for (const [name, d] of Object.entries(dicts)) {
      if (name === "pt") continue;
      for (const k of base) {
        expect(varsOf(d[k]), `${name}.${k}`).toEqual(varsOf(pt[k]));
      }
    }
  });

  it("DICTS cobre os 5 idiomas do produto", () => {
    expect(Object.keys(DICTS).sort()).toEqual(["en", "es", "fr", "pt", "zh"]);
    expect(LOCALES.map((l) => l.code).sort()).toEqual(["en", "es", "fr", "pt", "zh"]);
    expect(isLocale("zh")).toBe(true);
    expect(isLocale("xx")).toBe(false);
  });
});

describe("i18n — translate()", () => {
  it("interpola {{var}}", () => {
    expect(translate({ "a.b": "Olá {{nome}}, faltam {{n}} kcal" }, "a.b", { nome: "Ana", n: 120 })).toBe(
      "Olá Ana, faltam 120 kcal"
    );
  });

  it("causa no pt para chave desconhecida", () => {
    expect(translate(pt, "nao.existe")).toBe("nao.existe");
    expect(tFor("en")("goal.perder")).toBe("Lose fat");
    expect(tFor("pt")("goal.perder")).toBe("Emagrecer");
    expect(tFor("zh")("goal.perder")).toBe("减脂");
    expect(tFor("fr")("goal.perder")).toBe("Maigrir");
    expect(tFor("es")("goal.perder")).toBe("Emagrecer");
  });
});

describe("i18n — chaves usadas existem em todos os idiomas", () => {
  it("cobertura", () => {
    for (const k of USED_KEYS) {
      expect(Object.keys(pt), `pt tem ${k}`).toContain(k);
      expect(en[k], `en tem ${k}`).toBeTruthy();
    }
  });
});
