import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = { title: "Criar conta — FitVida" };
export const dynamic = "force-dynamic";

export default function CadastroPage() {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 sm:py-16">
      <AuthForm mode="cadastro" />
    </main>
  );
}
