"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, LogOut, Trash2, Copy, Check, ShieldAlert, UsersRound, RefreshCw } from "lucide-react";
import { createFamily, generateFamilyInvite, joinFamily, leaveFamily, removeFamilyMember, revokeFamilyInvite, familyOverview } from "@/app/actions";
import { useT } from "@/lib/i18n";

type Overview = Awaited<ReturnType<typeof familyOverview>>;

export default function FamilyBoard({ initial }: { initial: Overview }) {
  const t = useT();
  const router = useRouter();
  const [data, setData] = useState<Overview | null>(initial);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const refresh = () => start(async () => setData(await familyOverview()));

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError("");
      const r = await fn();
      if (!r.ok) setError(r.error ?? t("auth.genericError"));
      setData(await familyOverview());
      router.refresh();
    });

  const d = data!;
  if (!d.family) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold"><UsersRound size={18} /> {t("fam.createTitle")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("fam.createDesc")}</p>
          <div className="mt-4 flex gap-2">
            <input className="input" placeholder={t("fam.namePh")} value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn-primary shrink-0" disabled={pending || !name.trim()} onClick={() => act(async () => { const r = await createFamily(name); return r.ok ? { ok: true } : { ok: false, error: r.error }; })}>
              {t("fam.create")}
            </button>
          </div>
        </div>
        <div className="card p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold"><UserPlus size={18} /> {t("fam.joinTitle")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("fam.joinDesc")}</p>
          <div className="mt-4 flex gap-2">
            <input className="input" placeholder={t("fam.codePh")} value={code} onChange={(e) => setCode(e.target.value)} />
            <button className="btn-primary shrink-0" disabled={pending || !code.trim()} onClick={() => act(() => joinFamily(code))}>
              {t("fam.join")}
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-rose-600 lg:col-span-2">{error}</p>}
      </div>
    );
  }

  const ownerId = data!.family!.ownerId;

  return (
    <div className="space-y-4">
      {error && <p className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}
      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">{data!.family!.name}</h2>
            <p className="text-xs text-slate-500">{t("fam.membersCount", { n: data!.members.length })}</p>
          </div>
          <button className="btn-ghost !py-2" onClick={refresh} aria-label={t("fam.refresh")}><RefreshCw size={15} /></button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2">{t("fam.member")}</th>
                <th>{t("share.goal")}</th>
                <th>{t("dash.currentWeight")}</th>
                <th>{t("wp.weekWorkouts")}</th>
                <th>{t("mp.avgWater")}</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data!.members.map((m) => (
                <tr key={m.userId}>
                  <td className="py-2.5 font-semibold">
                    {m.name || "—"} {m.role === "owner" && <span className="ml-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">{t("fam.owner")}</span>}
                  </td>
                  <td>{t(`goal.${m.goal}`)}</td>
                  <td>{m.weightKg} {t("common.kg")} → {m.targetWeightKg} {t("common.kg")}</td>
                  <td>{m.workouts7}</td>
                  <td>{m.waterAvgMl} {t("common.ml")}</td>
                  <td className="text-right">
                    {ownerId !== m.userId && (
                      <button className="btn-ghost !p-1.5" aria-label={t("fam.remove")} onClick={() => act(() => removeFamilyMember(m.userId))}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 flex items-start gap-1.5 rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
          <ShieldAlert size={14} className="mt-0.5 shrink-0" /> {t("fam.privacyNote")}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="font-bold">{t("fam.invites")}</h3>
          <p className="mt-1 text-xs text-slate-500">{t("fam.invitesDesc")}</p>
          <button className="btn-primary mt-3 !py-2.5" disabled={pending} onClick={() => act(async () => {
            const r = await generateFamilyInvite();
            return r.ok ? { ok: true } : { ok: false, error: r.error };
          })}>
            <UserPlus size={15} /> {t("fam.newInvite")}
          </button>
          <ul className="mt-3 space-y-2">
            {data!.invites.filter((i) => !i.used).map((i) => (
              <li key={i.id} className="flex items-center gap-2 rounded-2xl border border-slate-100 p-2.5 text-sm">
                <code className="flex-1 truncate font-mono text-xs">{i.code}</code>
                <button className="btn-ghost !p-1.5" aria-label={t("share.copy")} onClick={() => { navigator.clipboard?.writeText(i.code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
                <button className="btn-ghost !p-1.5" aria-label={t("share.revoke")} onClick={() => act(() => revokeFamilyInvite(i.id))}>
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
            {!data!.invites.filter((i) => !i.used).length && <li className="text-xs text-slate-400">{t("fam.noInvites")}</li>}
          </ul>
        </div>
        <div className="card p-5">
          <h3 className="font-bold">{t("fam.joinTitle")}</h3>
          <p className="mt-1 text-xs text-slate-500">{t("fam.joinDesc")}</p>
          <div className="mt-3 flex gap-2">
            <input className="input" placeholder={t("fam.codePh")} value={code} onChange={(e) => setCode(e.target.value)} />
            <button className="btn-primary shrink-0" disabled={pending || !code.trim()} onClick={() => act(() => joinFamily(code))}>{t("fam.join")}</button>
          </div>
          <button className="btn-outline mt-4" disabled={pending} onClick={() => act(() => leaveFamily())}>
            <LogOut size={15} /> {t("fam.leave")}
          </button>
        </div>
      </div>
    </div>
  );
}
