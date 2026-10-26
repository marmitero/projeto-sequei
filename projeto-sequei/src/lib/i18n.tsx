"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  DEFAULT_LOCALE,
  DICTS,
  LOCALES,
  isLocale,
  tFor,
  translate,
  type Locale,
  type TFn,
  type TVars,
} from "./i18n-core";

// Reexports para componentes de cliente e testes.
export { DEFAULT_LOCALE, DICTS, LOCALES, isLocale, tFor, translate };
export type { Locale, TFn, TVars };

const I18nContext = createContext<{ locale: Locale; t: TFn }>({ locale: DEFAULT_LOCALE, t: tFor(DEFAULT_LOCALE) });

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(() => ({ locale, t: tFor(locale) }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): TFn {
  return useContext(I18nContext).t;
}

export function useLocale(): Locale {
  return useContext(I18nContext).locale;
}
