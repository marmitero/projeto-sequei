"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, FileJson, LogIn, LogOut, Table2, Upload, UserPlus, Loader2 } from "lucide-react";
import { logoutAccount, importData, type ImportPayload } from "@/app/actions";

const CSV_LINKS = [
  { href: "/api/export?format=csv&type=profile", label: "Perfil" },
  { href: "/api/export?format=csv&type=foods", label: "Alimentação" },
  { href: "/api/export?format=csv&type=water", label: "Água" },
  { href: "/api/export?format=csv&type=workouts", label: "Treinos" },
  { href: "/api/export?format=csv&type=metrics", label: "Métricas" },
];

export default function AccountPanel({ email }: { email: string | null }) {
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
        setErr("Arquivo inválido — use o backup JSON gerado pelo FitVida.");
      }
    });
  };

  return (
    <div className="card p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-bold">Conta e backup</h2>

      {email ? (
        <>
          <p className="mt-1 text-sm text-slate-500">
            Conectado como <b className="text-slate-700">{email}</b> — seus dados são sincronizados neste perfil.
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
            {pending ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />} Sair da conta
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
              <UserPlus size={16} /> Criar conta
            </Link>
            <Link href="/login" className="btn-outline">
              <LogIn size={16} /> Entrar
            </Link>
          </div>
        </>
      )}

      <div className="mt-6 border-t border-slate-100 pt-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Download size={16} className="text-emerald-600" /> Exportar dados
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="/api/export?format=json" className="btn-primary" download>
            <FileJson size={16} /> Backup JSON (tudo)
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
          <Upload size={16} className="text-emerald-600" /> Restaurar backup
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
        {msg && <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{msg}</p>}
        {err && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{err}</p>}
      </div>
    </div>
  );
}
