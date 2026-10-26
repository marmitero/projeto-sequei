"use client";

import { useT } from "@/lib/i18n";

import { useState } from "react";
import { Check, Copy, Link2, Plus, ShieldCheck, X } from "lucide-react";
import { createShare, revokeShare } from "@/app/actions";

type Share = { id: number; token: string; label: string; createdAt: string };

/** Links somente-leitura do plano (nutricionista, família) — criar, copiar e revogar. */
export default function SharePanel({ shares }: { shares: Share[] }) {
  const t = useT();
  const [items, setItems] = useState(shares);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

  const create = async () => {
    setBusy(true);
    const r = await createShare(label);
    setBusy(false);
    if (r.ok && r.token) {
      setItems([{ id: r.id ?? Date.now(), token: r.token, label: label.trim(), createdAt: new Date().toISOString() }, ...items]);
      setLabel("");
    }
  };

  const revoke = async (id: number) => {
    setItems((xs) => xs.filter((x) => x.id !== id));
    await revokeShare(id);
  };

  const copy = async (token: string, id: number) => {
    const url = `${location.origin}/compartilhar/${token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("share.copyPrompt", url);
    }
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="card p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-bold">
        <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400" /> {t("share.title")}
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        {t("share.desc1")} <b>{t("share.readonly")}</b> {t("share.desc2")}
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1">
          <label className="label">{t("share.label")}</label>
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t("share.labelPh")} maxLength={60} />
        </div>
        <button className="btn-primary" onClick={create} disabled={busy}>
          <Plus size={16} /> {t("share.create")}
        </button>
      </div>

      {items.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {items.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2">
              <Link2 size={15} className="text-slate-400" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{s.label || t("share.unnamed")}</div>
                <div className="truncate font-mono text-xs text-slate-400">/compartilhar/{s.token.slice(0, 12)}…</div>
              </div>
              <button className="btn-ghost !px-2.5 !py-1.5 text-xs" onClick={() => copy(s.token, s.id)}>
                {copied === s.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />} {t(copied === s.id ? "share.copied" : "share.copy")}
              </button>
              <button className="btn-ghost !px-2.5 !py-1.5 text-xs text-rose-600" onClick={() => revoke(s.id)}>
                <X size={14} /> {t("share.revoke")}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-slate-400">{t("share.none")}</p>
      )}
    </div>
  );
}
