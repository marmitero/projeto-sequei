"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { buildReminderSchedule, dueSlots, type ReminderInput } from "@/lib/reminders";

type RemState = "off" | "on" | "unsupported" | "denied";

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function snapshot(): RemState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return localStorage.getItem("fitvida-reminders") === "on" && Notification.permission === "granted" ? "on" : "off";
}

/**
 * Lembretes do navegador (Notification API) enquanto o app estiver aberto:
 * água ao longo do dia, treino e pesagem — calculados pelo perfil.
 */
export default function ReminderToggle({ profile, className = "" }: { profile?: ReminderInput; className?: string }) {
  const state = useSyncExternalStore(subscribe, snapshot, () => "off" as RemState);
  const fired = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (state !== "on" || !profile) return;
    const timer = window.setInterval(() => {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const slots = dueSlots(buildReminderSchedule(profile), now.getDay(), nowMinutes);
      for (const s of slots) {
        const key = `${now.toISOString().slice(0, 10)}:${s.kind}:${s.atMinutes}`;
        if (fired.current.has(key)) continue;
        fired.current.add(key);
        try {
          new Notification("FitVida", { body: s.label, icon: "/icon.png", tag: key });
        } catch {
          /* navegador pode exigir ServiceWorkerRegistration.showNotification */
        }
      }
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [state, profile]);

  const onClick = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (state === "on") {
      localStorage.setItem("fitvida-reminders", "off");
      emit();
      return;
    }
    if (Notification.permission === "denied") return;
    const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (perm === "granted") {
      localStorage.setItem("fitvida-reminders", "on");
      emit();
      try {
        new Notification("FitVida", { body: "Lembretes ativados! Vamos cuidar da sua rotina. 💪", icon: "/icon.png" });
      } catch {}
    } else {
      emit();
    }
  };

  if (state === "unsupported") return null;

  return (
    <button
      onClick={onClick}
      className={`btn-ghost !p-2.5 ${className}`}
      title={state === "on" ? "Lembretes ativados" : state === "denied" ? "Lembretes bloqueados no navegador" : "Ativar lembretes (água, treino, pesagem)"}
      aria-label={state === "on" ? "Desativar lembretes" : "Ativar lembretes"}
    >
      {state === "on" ? <BellRing size={18} className="text-emerald-600 dark:text-emerald-400" /> : state === "denied" ? <BellOff size={18} /> : <Bell size={18} />}
    </button>
  );
}
