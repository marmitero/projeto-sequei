import { redirect } from "next/navigation";
import { UserRound } from "lucide-react";
import ProfileWizard from "@/components/ProfileWizard";
import ResetButton from "./ResetButton";
import AccountPanel from "./AccountPanel";
import HealthImportPanel from "./HealthImportPanel";
import SharePanel from "./SharePanel";
import { getUser, toProfile, getSessionAccount } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { desc, eq, isNull } from "drizzle-orm";
import { getT } from "@/lib/i18n-server";
import { db } from "@/db";
import { planShares } from "@/db/schema";

export default async function PerfilPage() {
  const t = await getT();
  const user = await getUser();
  const shares = user
    ? await db
        .select({ id: planShares.id, token: planShares.token, label: planShares.label, createdAt: planShares.createdAt })
        .from(planShares)
        .where(eq(planShares.userId, user.id))
        .orderBy(desc(planShares.createdAt))
    : [];
  if (!user) redirect("/onboarding");
  const account = await getSessionAccount();
  return (
    <>
      <PageHeader title={t("pages.profile")} subtitle={t("pages.profileSub")} icon={<UserRound size={22} />} action={<ResetButton />} />
      <div className="mb-6">
        <AccountPanel email={account?.email ?? null} />
        <div className="mt-4">
          <HealthImportPanel />
        </div>
        <div className="mt-4">
          <SharePanel shares={shares.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }))} />
        </div>
      </div>
      <ProfileWizard mode="edit" initial={toProfile(user)} />
    </>
  );
}
