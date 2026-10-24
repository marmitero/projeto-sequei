import { redirect } from "next/navigation";
import { UserRound } from "lucide-react";
import ProfileWizard from "@/components/ProfileWizard";
import ResetButton from "./ResetButton";
import { getUser, toProfile } from "@/lib/session";
import { PageHeader } from "@/components/ui";

export default async function PerfilPage() {
  const user = await getUser();
  if (!user) redirect("/onboarding");
  return (
    <>
      <PageHeader title="Meu perfil" subtitle="Altere qualquer resposta: metas, cardápio, treino e hidratação são recalculados na hora." icon={<UserRound size={22} />} action={<ResetButton />} />
      <ProfileWizard mode="edit" initial={toProfile(user)} />
    </>
  );
}
