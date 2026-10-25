"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "fitvida-theme";
export type Theme = "light" | "dark";

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function readTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const t = localStorage.getItem(KEY);
    if (t === "light" || t === "dark") return t;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

function persist(theme: Theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* modo privado */
  }
  emit();
}

/** Alterna claro/escuro e persiste a escolha (com fallback para o sistema). */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as Theme);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    persist(next);
  };

  return (
    <button
      onClick={toggle}
      className={`btn-ghost !p-2.5 ${className}`}
      title={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
      aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
    >
      {theme === "dark" ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
    </button>
  );
}
