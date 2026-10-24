import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, validatePassword, normalizeEmail, isValidEmail } from "../../src/lib/password";
import { rateLimit, resetRateLimit } from "../../src/lib/ratelimit";

describe("password", () => {
  it("hash + verify (roundtrip)", () => {
    const h = hashPassword("minha-senha-123");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("minha-senha-123", h)).toBe(true);
    expect(verifyPassword("errada", h)).toBe(false);
  });

  it("hash alterado ou formato inválido não confere", () => {
    const h = hashPassword("abc12345");
    expect(verifyPassword("abc12345", h.replace(/.$/, "0"))).toBe(false);
    expect(verifyPassword("abc12345", "bcrypt$1$2$3$a$b")).toBe(false);
    expect(verifyPassword("abc12345", "")).toBe(false);
  });

  it("senhas com mesmo conteúdo têm saltos diferentes", () => {
    expect(hashPassword("igual")).not.toBe(hashPassword("igual"));
  });

  it("validação de senha e e-mail", () => {
    expect(validatePassword("1234567")).not.toBeNull();
    expect(validatePassword("12345678")).toBeNull();
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("invalido")).toBe(false);
    expect(normalizeEmail("  User@Email.COM ")).toBe("user@email.com");
    expect(normalizeEmail(null)).toBe("");
  });
});

describe("ratelimit", () => {
  it("permite até max e bloqueia após", () => {
    resetRateLimit();
    const now = 1_000_000;
    expect(rateLimit("k", 3, 60_000, now)).toBe(true);
    expect(rateLimit("k", 3, 60_000, now + 1)).toBe(true);
    expect(rateLimit("k", 3, 60_000, now + 2)).toBe(true);
    expect(rateLimit("k", 3, 60_000, now + 3)).toBe(false);
  });

  it("janela deslizante libera após o tempo", () => {
    resetRateLimit();
    const now = 2_000_000;
    expect(rateLimit("w", 1, 1_000, now)).toBe(true);
    expect(rateLimit("w", 1, 1_000, now + 500)).toBe(false);
    expect(rateLimit("w", 1, 1_000, now + 1_500)).toBe(true);
  });

  it("chaves independentes", () => {
    resetRateLimit();
    const now = 3_000_000;
    expect(rateLimit("a", 1, 60_000, now)).toBe(true);
    expect(rateLimit("a", 1, 60_000, now)).toBe(false);
    expect(rateLimit("b", 1, 60_000, now)).toBe(true);
  });
});
