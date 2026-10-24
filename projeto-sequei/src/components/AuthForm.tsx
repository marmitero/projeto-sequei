"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Leaf, LogIn, UserPlus, Loader2 } from "lucide-react";
import { loginAccount, registerAccount } from "@/app/actions";

export default function AuthForm({ mode }: { mode: "login" | "cadastro" }) {
  const isLogin = mode === "login";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  const submit = () => {
    setError("");
    if (!isLogin && password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    start(async () => {
      const r = isLogin ? await loginAccount(email, password) : await registerAccount(email, password);
      if (!r.ok) {
        setError(r.error ?? "Não foi possível continuar.");
        return;
      }
      router.push("/");
      router.refresh();
    });
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
          <Leaf size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{isLogin ? "Entrar no FitVida" : "Crie sua conta"}</h1>
          <p className="text-sm text-slate-500">
            {isLogin ? "Acesse seus dados em qualquer dispositivo." : "Grátis — para não perder seus dados."}
          </p>
        </div>
      </div>

      <div className="card space-y-4 p-6">
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Senha</label>
          <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isLogin ? "Sua senha" : "Mínimo 8 caracteres"} autoComplete={isLogin ? "current-password" : "new-password"} />
        </div>
        {!isLogin && (
          <div>
            <label className="label" htmlFor="confirm">Confirmar senha</label>
            <input id="confirm" type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repita a senha" autoComplete="new-password" />
          </div>
        )}
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
        <button className="btn-primary w-full" onClick={submit} disabled={pending || !email || !password}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : isLogin ? <LogIn size={16} /> : <UserPlus size={16} />}
          {pending ? "Aguarde..." : isLogin ? "Entrar" : "Criar conta"}
        </button>
        <p className="text-center text-sm text-slate-500">
          {isLogin ? (
            <>
              Ainda não tem conta?{" "}
              <Link href="/cadastro" className="font-semibold text-emerald-600">Criar conta</Link>
            </>
          ) : (
            <>
              Já tem conta?{" "}
              <Link href="/login" className="font-semibold text-emerald-600">Entrar</Link>
            </>
          )}
        </p>
        {!isLogin && (
          <p className="text-center text-xs text-slate-400">
            Ao criar sua conta, os dados já registrados neste navegador serão vinculados a ela.
          </p>
        )}
      </div>

      <p className="mt-4 text-center text-sm text-slate-500">
        <Link href="/onboarding" className="text-slate-500 underline underline-offset-2">Continuar sem conta</Link>
      </p>
    </div>
  );
}
