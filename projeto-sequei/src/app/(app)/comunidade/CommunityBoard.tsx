"use client";

import { useState } from "react";
import { Heart, Plus, Trash2, X } from "lucide-react";
import { submitCommunityRecipe, toggleCommunityLike, deleteCommunityRecipe } from "@/app/actions";
import { useT } from "@/lib/i18n";

type Recipe = {
  id: number;
  userId: string;
  name: string;
  description: string;
  ingredients: { name: string; grams: number }[];
  steps: string;
  tags: string[];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  author: string;
  likeCount: number;
  likedByMe: boolean;
  isMine: boolean;
};

const emptyForm = { name: "", description: "", ingredientsText: "", steps: "", tagsText: "", kcal: "", protein: "", carbs: "", fat: "" };

/** Galeria de receitas da comunidade: envio, curtida e exclusão. */
export default function CommunityBoard({ recipes: initial }: { recipes: Recipe[] }) {
  const t = useT();
  const [recipes, setRecipes] = useState(initial);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const set = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    setBusy(true);
    setMsg("");
    const r = await submitCommunityRecipe({
      name: form.name,
      description: form.description,
      ingredientsText: form.ingredientsText,
      steps: form.steps,
      tagsText: form.tagsText,
      kcal: Number(form.kcal),
      protein: Number(form.protein),
      carbs: Number(form.carbs),
      fat: Number(form.fat),
    });
    setBusy(false);
    if (!r.ok || !r.id) {
      setMsg(r.error ?? "comm.submitError");
      return;
    }
    setRecipes([
      {
        id: r.id,
        userId: "",
        name: form.name.trim(),
        description: form.description.trim(),
        ingredients: [],
        steps: form.steps.trim(),
        tags: form.tagsText.split(/[,;]/).map((t) => t.trim().toLowerCase()).filter(Boolean),
        kcal: Number(form.kcal) || 0,
        protein: Number(form.protein) || 0,
        carbs: Number(form.carbs) || 0,
        fat: Number(form.fat) || 0,
        author: "Você",
        likeCount: 0,
        likedByMe: false,
        isMine: true,
      },
      ...recipes,
    ]);
    setForm(emptyForm);
    setOpen(false);
  };

  const like = async (id: number) => {
    setRecipes((rs) => rs.map((r) => (r.id === id ? { ...r, likedByMe: !r.likedByMe, likeCount: r.likeCount + (r.likedByMe ? -1 : 1) } : r)));
    await toggleCommunityLike(id);
  };

  const remove = async (id: number) => {
    setRecipes((rs) => rs.filter((r) => r.id !== id));
    await deleteCommunityRecipe(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">{recipes.length} {t("comm.count", { n: recipes.length })}</div>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Plus size={16} /> {t("comm.submit")}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="card relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold">{t("comm.submit")}</h3>
              <button className="btn-ghost !p-2" onClick={() => setOpen(false)} aria-label={t("common.close")}>
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">{t("comm.name")}</label>
                <input className="input" value={form.name} onChange={set("name")} placeholder={t("comm.namePh")} />
              </div>
              <div>
                <label className="label">{t("comm.desc")}</label>
                <input className="input" value={form.description} onChange={set("description")} placeholder={t("comm.descPh")} />
              </div>
              <div>
                <label className="label">{t("comm.ingredients")}</label>
                <textarea className="input min-h-24" value={form.ingredientsText} onChange={set("ingredientsText")} />
              </div>
              <div>
                <label className="label">{t("comm.steps")}</label>
                <textarea className="input min-h-24" value={form.steps} onChange={set("steps")} />
              </div>
              <div>
                <label className="label">{t("comm.tags")}</label>
                <input className="input" value={form.tagsText} onChange={set("tagsText")} placeholder={t("comm.tagsPh")} />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="label">{t("common.kcal")} *</label>
                  <input className="input" inputMode="numeric" value={form.kcal} onChange={set("kcal")} />
                </div>
                <div>
                  <label className="label">{t("table.protein")} (g)</label>
                  <input className="input" inputMode="numeric" value={form.protein} onChange={set("protein")} />
                </div>
                <div>
                  <label className="label">{t("table.carbs")} (g)</label>
                  <input className="input" inputMode="numeric" value={form.carbs} onChange={set("carbs")} />
                </div>
                <div>
                  <label className="label">{t("table.fat")} (g)</label>
                  <input className="input" inputMode="numeric" value={form.fat} onChange={set("fat")} />
                </div>
              </div>
              {msg && <p className="text-sm text-rose-600">{msg}</p>}
              <button className="btn-primary w-full" onClick={submit} disabled={busy}>
                {busy ? "photo.uploading" : "comm.publish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {recipes.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r) => (
            <article key={r.id} className="card flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold leading-tight">{r.name}</h3>
                  <div className="text-xs text-slate-400">{t("comm.by")} {r.author}</div>
                </div>
                {r.isMine && (
                  <button className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" onClick={() => remove(r.id)} aria-label={t("comm.delete")}>
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
              {r.description && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{r.description}</p>}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {r.tags.map((t) => (
                  <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-100/10 dark:text-slate-300">
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-4 gap-1 text-center text-xs">
                <div className="rounded-xl bg-slate-50 py-1.5 dark:bg-slate-100/5">
                  <div className="font-bold tabular-nums">{r.kcal}</div>
                  <div className="text-[10px] text-slate-400">{t("common.kcal")}</div>
                </div>
                <div className="rounded-xl bg-slate-50 py-1.5 dark:bg-slate-100/5">
                  <div className="font-bold tabular-nums">{r.protein}g</div>
                  <div className="text-[10px] text-slate-400">{t("comm.p")}</div>
                </div>
                <div className="rounded-xl bg-slate-50 py-1.5 dark:bg-slate-100/5">
                  <div className="font-bold tabular-nums">{r.carbs}g</div>
                  <div className="text-[10px] text-slate-400">{t("comm.c")}</div>
                </div>
                <div className="rounded-xl bg-slate-50 py-1.5 dark:bg-slate-100/5">
                  <div className="font-bold tabular-nums">{r.fat}g</div>
                  <div className="text-[10px] text-slate-400">{t("comm.g")}</div>
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between pt-3">
                <button className={`btn-ghost !px-3 !py-1.5 text-sm ${r.likedByMe ? "text-rose-600" : "text-slate-500"}`} onClick={() => like(r.id)} aria-label={t("comm.like")}>
                  <Heart size={16} fill={r.likedByMe ? "currentColor" : "none"} /> {r.likeCount}
                </button>
                {r.ingredients.length > 0 && <div className="text-[11px] text-slate-400">{r.ingredients.length} {t("comm.nIngredients", { n: r.ingredients.length })}</div>}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="card p-10 text-center text-sm text-slate-500">
          {t("comm.empty")}
        </div>
      )}
    </div>
  );
}
