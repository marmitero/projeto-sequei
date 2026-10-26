"use client";

import { useT } from "@/lib/i18n";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, FileJson, LogIn, LogOut, Table2, Upload, UserPlus, Loader2 } from "lucide-react";
import { logoutAccount, importData, type ImportPayload } from "@/app/actions";

const CSV_LINKS = [
  { href: "/api/export?format=csv&type=profile", label: "nav.profile" },
  { href: "/api/export?format=csv&type=foods", label: "nav.food" },
  { href: "/api/export?format=csv&type=water", label: "Água" },
  { href: "/api/export?format=csv&type=workouts", label: "nav.workout" },
  { href: "/api/export?format=csv&type=metrics", label: "nav.metrics" },
];

export default function AccountPanel({ email }: { email: string | null }) {
  const t = useT();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const onImport = (file: File) => {
    setErr("");
    setMsg("");
    start(async () => {
      try {
        const text = await file.text();
        const payload = JSON.parse(text) as ImportPayload;
        const r = await importData(payload);
        if (!r.ok) setErr(r.error ?? "Falha ao importar.");
        else {
          const total = Object.values(r.imported ?? {}).reduce((a, b) => a + b, 0);
          setMsg(`Importação concluída: ${total} registro(s) adicionados.`);
          router.refresh();
        }
      } catch {
        setErr("acc.invalidFile");
      }
    });
  };

  return (
    <div className="card p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-bold">{t("acc.title")}</h2>

      {email ? (
        <>
          <p className="mt-1 text-sm text-slate-500">
            {t("acc.connectedAs")} <b className="text-slate-700">{email}</b> — {t("acc.synced")}
          </p>
          <button
            className="btn-outline mt-4"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await logoutAccount();
                router.push("/login");
                router.refresh();
              })
            }
          >
            {pending ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />} {t("acc.logout")}
          </button>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-slate-500">
            Você está usando o FitVida sem conta (apenas neste navegador). Crie uma conta para acessar seus dados em
            qualquer dispositivo e não perdê-los.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/cadastro" className="btn-primary">
              <UserPlus size={16} /> {t("auth.signupBtn")}
            </Link>
            <Link href="/login" className="btn-outline">
              <LogIn size={16} /> {t("auth.loginBtn")}
            </Link>
          </div>
        </>
      )}

      <div className="mt-6 border-t border-slate-100 pt-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Download size={16} className="text-emerald-600 dark:text-emerald-400" /> {t("acc.export")}
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="/api/export?format=json" className="btn-primary" download>
            <FileJson size={16} /> {t("acc.backupAll")}
          </a>
          {CSV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="btn-outline !px-3 !py-2 text-xs" download>
              <Table2 size={14} /> CSV {l.label}
            </a>
          ))}
        </div>
      </div>

      <div className="mt-6 border-t border-slate-100 pt-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Upload size={16} className="text-emerald-600 dark:text-emerald-400" /> {t("acc.restore")}
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Importe um backup JSON exportado pelo FitVida. Registros são adicionados ao seu histórico (métricas do mesmo
          dia são atualizadas).
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImport(f);
            e.target.value = "";
          }}
        />
        <button className="btn-outline mt-3" disabled={pending} onClick={() => fileRef.current?.click()}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Escolher arquivo JSON
        </button>
        {msg && <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">{msg}</p>}
        {err && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">{err}</p>}
      </div>
    </div>
  );
}
