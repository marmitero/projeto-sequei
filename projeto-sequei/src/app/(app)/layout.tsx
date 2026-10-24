import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import AppShell from "@/components/AppShell";
import { getUser } from "@/lib/session";
import { GOALS } from "@/lib/calc";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/onboarding");
  return (
    <AppShell name={user.name} goal={GOALS[user.goal]?.label ?? ""}>
      {children}
    </AppShell>
  );
}
