import Link from "next/link";
import { LogIn } from "lucide-react";
import ProfileWizard from "@/components/ProfileWizard";
import { getUser, toProfile } from "@/lib/session";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const t = await getT();
  // Se já existe perfil (ex.: retorno após falha de navegação), pré-preenche o
  // formulário em vez de descartar os dados do usuário.
  const user = await getUser();
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto mb-4 flex max-w-3xl items-center justify-end">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:text-emerald-300">
          <LogIn size={16} /> {t("auth.hasAccount")}
        </Link>
      </div>
      <ProfileWizard mode="create" initial={user ? toProfile(user) : undefined} />
    </main>
  );
}
