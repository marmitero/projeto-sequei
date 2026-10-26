"use client";

import { useT } from "@/lib/i18n";

import { useState } from "react";
import { Camera, Columns2, Trash2, Upload } from "lucide-react";

type PhotoMeta = { id: number; date: string; label: string; mime: string };

/** Fotos de progresso: upload, galeria e comparação lado a lado. */
export default function PhotosSection({ today, initialPhotos }: { today: string; initialPhotos: PhotoMeta[] }) {
  const t = useT();
  const [photos, setPhotos] = useState<PhotoMeta[]>(initialPhotos);
  const [date, setDate] = useState(today);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [compare, setCompare] = useState<number[]>([]);

  const reload = async () => {
    try {
      const r = await fetch("/api/photos");
      const j = await r.json();
      setPhotos(j.photos ?? []);
    } catch {
      /* sem rede */
    }
  };

  const upload = async (file: File) => {
    setBusy(true);
    setMsg("");
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("date", date);
      fd.set("label", label);
      const r = await fetch("/api/photos", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) setMsg(j.error ?? "photo.uploadError");
      else {
        setMsg("photo.uploaded");
        setLabel("");
        await reload();
      }
    } catch {
      setMsg("photo.uploadFail");
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(""), 2000);
    }
  };

  const remove = async (id: number) => {
    await fetch(`/api/photos/${id}`, { method: "DELETE" });
    setCompare((c) => c.filter((x) => x !== id));
    reload();
  };

  const toggleCompare = (id: number) => {
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id].slice(-2)));
  };

  const selected = compare.map((id) => photos.find((p) => p.id === id)).filter(Boolean) as PhotoMeta[];

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Camera size={18} className="text-emerald-600 dark:text-emerald-400" />
        <h2 className="text-xl font-bold">{t("photo.title")}</h2>
        <span className="ml-auto flex items-center gap-1 text-xs text-slate-400">
          <Columns2 size={14} /> {t("photo.compareHint")}
        </span>
      </div>

      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="label">{t("mp.date")}</label>
          <input type="date" className="input !w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="min-w-40 flex-1">
          <label className="label">{t("photo.note")}</label>
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t("photo.notePh")} />
        </div>
        <label className={`btn-primary cursor-pointer ${busy ? "opacity-60" : ""}`}>
          <Upload size={16} /> {t(busy ? "photo.uploading" : "photo.upload")}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
        </label>
        {msg && <p className="w-full text-sm text-emerald-600 dark:text-emerald-400">{t(msg)}</p>}
      </div>

      {selected.length === 2 && (
        <div className="grid grid-cols-2 gap-3">
          {selected.map((p) => (
            <div key={p.id} className="card overflow-hidden p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/photos/${p.id}`} alt={p.label || `Foto de ${p.date}`} className="h-64 w-full rounded-2xl object-contain" />
              <div className="p-2 text-center text-xs text-slate-500">
                {p.date} {p.label && `· ${p.label}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((p) => {
            const on = compare.includes(p.id);
            return (
              <div key={p.id} className={`card cursor-pointer overflow-hidden p-2 transition ${on ? "ring-2 ring-emerald-500" : ""}`} onClick={() => toggleCompare(p.id)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/photos/${p.id}`} alt={p.label || `Foto de ${p.date}`} className="h-36 w-full rounded-xl object-cover" loading="lazy" />
                <div className="flex items-center justify-between p-1.5">
                  <div className="truncate text-[11px] text-slate-500">
                    {p.date} {p.label && `· ${p.label}`}
                  </div>
                  <button
                    className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(p.id);
                    }}
                    aria-label={t("photo.delete")}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card p-8 text-center text-sm text-slate-500">
          Nenhuma foto ainda — registre sua evolução visual ao longo das semanas. 📸
        </div>
      )}
    </section>
  );
}
