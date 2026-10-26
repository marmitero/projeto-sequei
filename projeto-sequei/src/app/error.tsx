"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useT } from "@/lib/i18n";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="card w-full max-w-md p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-600 dark:text-rose-400">
          <AlertTriangle size={26} />
        </div>
        <h1 className="mt-4 text-xl font-bold">{t("err.title")}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {t("err.body")}
        </p>
        {error.digest && <p className="mt-2 text-xs text-slate-400">Código: {error.digest}</p>}
        <button onClick={reset} className="btn-primary mx-auto mt-6">
          <RotateCcw size={16} /> {t("err.retry")}
        </button>
      </div>
    </main>
  );
}
