"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Globe } from "lucide-react";
import { LOCALES, useLocale, useT } from "@/lib/i18n";

/** Alterna o idioma do app (cookie `fitvida-lang`, padrão pt-BR). */
export default function LanguageToggle({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const pick = (code: string) => {
    document.cookie = `fitvida-lang=${code};path=/;max-age=31536000;samesite=lax`;
    setOpen(false);
    router.refresh();
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className={`btn-ghost !p-2.5 ${className}`} title={t("lang.switch")} aria-label={t("lang.switch")}>
        <Globe size={18} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-40 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-100/10 dark:bg-slate-100">
            {LOCALES.map((l) => (
              <button
                key={l.code}
                onClick={() => pick(l.code)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-100/10 ${l.code === locale ? "font-bold text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300"}`}
              >
                <span>{l.flag}</span> {l.label}
                {l.code === locale && <Check size={14} className="ml-auto" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
