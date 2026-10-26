// Núcleo i18n puro (sem "use client") — usado por client (i18n.tsx) e server (i18n-server.ts).
import pt from "./messages/pt";
import en from "./messages/en";
import fr from "./messages/fr";
import es from "./messages/es";
import zh from "./messages/zh";

export type Locale = "pt" | "en" | "fr" | "es" | "zh";

export const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
];

export const DEFAULT_LOCALE: Locale = "pt";

export const DICTS: Record<Locale, Record<string, string>> = { pt, en, fr, es, zh };

export type TVars = Record<string, string | number>;
export type TFn = (key: string, vars?: TVars) => string;

export function translate(dict: Record<string, string>, key: string, vars?: TVars): string {
  let s = dict[key] ?? pt[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{{${k}}}`).join(String(v));
  return s;
}

export function tFor(locale: Locale): TFn {
  const dict = DICTS[locale] ?? pt;
  return (key, vars) => translate(dict, key, vars);
}

export function isLocale(x: unknown): x is Locale {
  return typeof x === "string" && LOCALES.some((l) => l.code === x);
}
