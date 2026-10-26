"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useT } from "@/lib/i18n";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Leaf, LogIn, UserPlus, Loader2 } from "lucide-react";
import { loginAccount, registerAccount } from "@/app/actions";
import { persistAuthCookies } from "@/lib/clientCookies";

export default function AuthForm({ mode }: { mode: "login" | "cadastro" }) {
  const isLogin = mode === "login";
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isLogin && password !== confirm) {
      setError(t("auth.mismatch"));
      return;
    }
    if (!email || !password) return;
    start(async () => {
      try {
        const r = isLogin ? await loginAccount(email, password) : await registerAccount(email, password);
        if (!r.ok) {
          setError(r.error ?? t("auth.genericError"));
          return;
        }
        persistAuthCookies({ fituid: r.fituid, session: r.session });
        router.push("/");
        router.refresh();
      } catch {
        setError(t("auth.networkError"));
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
          <Leaf size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{isLogin ? t("auth.loginTitle") : t("auth.signupTitle")}</h1>
          <p className="text-sm text-slate-500">
            {isLogin ? t("auth.loginSub") : t("auth.signupSub")}
          </p>
        </div>
      </div>

      <form className="card space-y-4 p-6" onSubmit={submit}>
        <div>
          <label className="label" htmlFor="email">{t("auth.email")}</label>
          <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">{t("auth.password")}</label>
          <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isLogin ? t("auth.passwordPh") : t("auth.passwordMinPh")} autoComplete={isLogin ? "current-password" : "new-password"} />
        </div>
        {!isLogin && (
          <div>
            <label className="label" htmlFor="confirm">{t("auth.confirm")}</label>
            <input id="confirm" type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={t("auth.confirmPh")} autoComplete="new-password" />
          </div>
        )}
        {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={pending || !email || !password}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : isLogin ? <LogIn size={16} /> : <UserPlus size={16} />}
          {pending ? t("auth.wait") : isLogin ? t("auth.loginBtn") : t("auth.signupBtn")}
        </button>
        <p className="text-center text-sm text-slate-500">
          {isLogin ? (
            <>
              {t("auth.noAccount")}{" "}
              <Link href="/cadastro" className="font-semibold text-emerald-600 dark:text-emerald-400">{t("auth.signupBtn")}</Link>
            </>
          ) : (
            <>
              {t("auth.hasAccount")}{" "}
              <Link href="/login" className="font-semibold text-emerald-600 dark:text-emerald-400">{t("auth.loginBtn")}</Link>
            </>
          )}
        </p>
        {!isLogin && (
          <p className="text-center text-xs text-slate-400">
            {t("auth.linkNote")}
          </p>
        )}
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        <Link href="/onboarding" className="text-slate-500 underline underline-offset-2">{t("auth.noAccountContinue")}</Link>
      </p>
    </div>
  );
}
