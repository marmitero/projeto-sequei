// Fallback de cookies de identidade para quando um proxy descarta o `Set-Cookie`
// das Server Actions: o cliente grava os mesmos valores via `document.cookie`.
// Se o cookie HttpOnly já foi gravado pelo servidor, a escrita é ignorada pelo
// navegador (HttpOnly não pode ser sobrescrito por JS) — inofensivo.

export function persistAuthCookies(opts: { fituid?: string | null; session?: string | null }) {
  if (typeof document === "undefined") return;
  const https = typeof location !== "undefined" && location.protocol === "https:";
  const flags = https ? "SameSite=None; Secure" : "SameSite=Lax";
  const has = (name: string) => document.cookie.split("; ").some((c) => c.startsWith(`${name}=`));
  if (opts.fituid && !has("fituid")) {
    document.cookie = `fituid=${opts.fituid}; path=/; max-age=${60 * 60 * 24 * 365 * 2}; ${flags}`;
  }
  if (opts.session && !has("fit_session")) {
    document.cookie = `fit_session=${opts.session}; path=/; max-age=${60 * 60 * 24 * 30}; ${flags}`;
  }
}
