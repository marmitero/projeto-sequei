import { redirect } from "next/navigation";
import { UserRound } from "lucide-react";
import ProfileWizard from "@/components/ProfileWizard";
import ResetButton from "./ResetButton";
import AccountPanel from "./AccountPanel";
import { getUser, toProfile, getSessionAccount } from "@/lib/session";
import { PageHeader } from "@/components/ui";

export default async function PerfilPage() {
  const user = await getUser();
  if (!user) redirect("/onboarding");
  const account = await getSessionAccount();
  return (
    <>
      <PageHeader title="Meu perfil" subtitle="Altere qualquer resposta: metas, cardápio, treino e hidratação são recalculados na hora." icon={<UserRound size={22} />} action={<ResetButton />} />
      <div className="mb-6">
        <AccountPanel email={account?.email ?? null} />
      </div>
      <ProfileWizard mode="edit" initial={toProfile(user)} />
    </>
  );
}
