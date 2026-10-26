"use client";

import { useT } from "@/lib/i18n";

import { useState } from "react";
import { HeartPulse, Upload } from "lucide-react";

/**
 * Importa dados de saúde de plataformas externas via arquivo:
 * - Apple Health: export.xml (Pessoal → Exportar dados de saúde);
 * - Google Fit: Takeout CSV de peso (ou planilha com colunas data + peso kg).
 */
export default function HealthImportPanel() {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    setErr(false);
    setMsg("");
    try {
      const fd = new FormData();
      fd.set("file", file);
      const r = await fetch("/api/health-import", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) {
        setErr(true);
        setMsg(j.error ?? "Não foi possível importar o arquivo.");
      } else {
        setMsg(`Importado: ${j.days} dia(s) — ${j.weights} peso(s), ${j.bodyFat} gordura, ${j.sleep} sono.`);
      }
    } catch {
      setErr(true);
      setMsg("health.sendFail");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-bold">
        <HeartPulse size={18} className="text-emerald-600 dark:text-emerald-400" /> {t("health.title")}
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        {t("health.desc1")} <b>Apple Health</b> {t("health.desc2")} <b>Google Fit</b> {t("health.desc3")}
      </p>
      <label className={`btn-primary mt-3 inline-flex cursor-pointer ${busy ? "opacity-60" : ""}`}>
        <Upload size={16} /> {t(busy ? "health.importing" : "health.chooseFile")}
        <input
          type="file"
          accept=".xml,.csv,text/xml,text/csv,application/xml"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
      </label>
      {msg && <p className={`mt-3 text-sm ${err ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>{t(msg)}</p>}
    </div>
  );
}
