import { cookies } from "next/headers";
import { isLocale, tFor, translate, DICTS, type Locale, type TFn, type TVars } from "./i18n-core";

export const LANG_COOKIE = "fitvida-lang";

/** Idioma salvo no cookie (padrão: pt-BR). */
export async function getLocale(): Promise<Locale> {
  const c = await cookies();
  const v = c.get(LANG_COOKIE)?.value;
  return isLocale(v) ? v : "pt";
}

/** Função de tradução para componentes de servidor. */
export async function getT(): Promise<TFn> {
  return tFor(await getLocale());
}

export { translate, DICTS, isLocale, tFor };
export type { Locale, TFn, TVars };
