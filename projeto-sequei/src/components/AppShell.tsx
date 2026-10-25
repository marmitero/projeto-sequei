"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Home, Utensils, Dumbbell, Droplets, LineChart, ChefHat, Table2, UserRound, Menu, X, Leaf, ShoppingCart, Bell, Users } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import ReminderToggle from "./ReminderToggle";
import type { ReminderInput } from "@/lib/reminders";

const NAV = [
  { href: "/", label: "Início", icon: Home },
  { href: "/alimentacao", label: "Alimentação", icon: Utensils },
  { href: "/compras", label: "Lista de Compras", icon: ShoppingCart },
  { href: "/exercicios", label: "Treinos", icon: Dumbbell },
  { href: "/hidratacao", label: "Hidratação", icon: Droplets },
  { href: "/metricas", label: "Métricas", icon: LineChart },
  { href: "/receitas", label: "Receitas Low-Carb", icon: ChefHat },
  { href: "/comunidade", label: "Comunidade", icon: Users },
  { href: "/tabela", label: "Tabela Nutricional", icon: Table2 },
  { href: "/perfil", label: "Meu perfil", icon: UserRound },
];

const MOBILE = ["/", "/alimentacao", "/exercicios", "/hidratacao"];

export default function AppShell({ children, name, goal, reminders }: { children: ReactNode; name: string; goal: string; reminders?: ReminderInput }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const initials = name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar: trilho de ícones no tablet, completa no desktop */}
      <aside className="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-slate-200/70 bg-[#0b1220] text-[#cbd5e1] md:flex md:w-20 lg:w-64">
        <Link href="/" className="flex items-center gap-3 px-5 py-6">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
            <Leaf size={20} />
          </div>
          <div className="hidden lg:block">
            <div className="text-lg font-bold text-white">FitVida</div>
            <div className="text-xs text-[#94a3b8]">Seu plano, do seu jeito</div>
          </div>
        </Link>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map((n) => {
            const Icon = n.icon;
            const on = active(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                title={n.label}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition md:justify-center lg:justify-start ${
                  on ? "bg-emerald-500/15 text-emerald-300" : "hover:bg-white/5 dark:hover:bg-slate-100/5 hover:text-white"
                }`}
              >
                <Icon size={20} className="shrink-0" />
                <span className="hidden lg:inline">{n.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mx-3 mb-2 flex items-center gap-2 md:justify-center lg:justify-end">
          <ReminderToggle profile={reminders} />
          <ThemeToggle />
        </div>
        <Link href="/perfil" className="m-3 flex items-center gap-3 rounded-2xl bg-white/5 dark:bg-slate-100/5 p-3 md:justify-center lg:justify-start">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500 text-sm font-bold text-white">{initials}</div>
          <div className="hidden min-w-0 lg:block">
            <div className="truncate text-sm font-semibold text-white">{name}</div>
            <div className="truncate text-xs text-slate-400">{goal}</div>
          </div>
        </Link>
      </aside>

      {/* Topo no celular */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/70 bg-white/85 dark:bg-slate-100/85 px-4 py-3 backdrop-blur md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white">
            <Leaf size={16} />
          </div>
          <span className="font-bold">FitVida</span>
        </Link>
        <div className="flex items-center gap-1.5">
          <ReminderToggle profile={reminders} className="!p-2" />
          <ThemeToggle className="!p-2" />
          <Link href="/perfil" className="grid h-8 w-8 place-items-center rounded-full bg-emerald-500 text-xs font-bold text-white">
            {initials}
          </Link>
        </div>
      </header>

      <main className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 md:pb-10 lg:px-10 lg:pt-8">
        <div className="mx-auto max-w-6xl animate-fade-up">{children}</div>
      </main>

      {/* Barra inferior no celular */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 dark:bg-slate-100/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {NAV.filter((n) => MOBILE.includes(n.href)).map((n) => {
            const Icon = n.icon;
            const on = active(n.href);
            return (
              <Link key={n.href} href={n.href} className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${on ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"}`}>
                <Icon size={22} />
                {n.label.split(" ")[0]}
              </Link>
            );
          })}
          <button onClick={() => setOpen(true)} className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${!MOBILE.some((m) => active(m)) ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"}`}>
            <Menu size={22} />
            Mais
          </button>
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white dark:bg-slate-100 p-5 pb-8 animate-fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <span className="font-bold">Mais opções</span>
              <button onClick={() => setOpen(false)} className="btn-ghost !p-2" aria-label="Fechar">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {NAV.filter((n) => !MOBILE.includes(n.href)).map((n) => {
                const Icon = n.icon;
                return (
                  <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-2xl border p-4 text-sm font-semibold ${active(n.href) ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:text-emerald-300" : "border-slate-200 text-slate-700"}`}>
                    <Icon size={20} />
                    {n.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
