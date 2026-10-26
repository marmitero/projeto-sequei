import { getT } from "@/lib/i18n-server";
import { familyOverview } from "@/app/actions";
import { UsersRound } from "lucide-react";
import { PageHeader } from "@/components/ui";
import FamilyBoard from "./FamilyBoard";

export default async function FamiliaPage() {
  const t = await getT();
  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.family")} subtitle={t("pages.familySub")} icon={<UsersRound size={22} />} />
      <FamilyBoard initial={await familyOverview()} />
    </div>
  );
}
