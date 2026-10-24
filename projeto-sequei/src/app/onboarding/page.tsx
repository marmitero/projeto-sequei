import Link from "next/link";
import { LogIn } from "lucide-react";
import ProfileWizard from "@/components/ProfileWizard";

export const dynamic = "force-dynamic";

export default function OnboardingPage() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto mb-4 flex max-w-3xl items-center justify-end">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700">
          <LogIn size={16} /> Já tem conta? Entrar
        </Link>
      </div>
      <ProfileWizard mode="create" />
    </main>
  );
}
