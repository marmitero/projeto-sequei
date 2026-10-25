import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import AppShell from "@/components/AppShell";
import { getUser } from "@/lib/session";
import { GOALS, computeTargets } from "@/lib/calc";
import { toProfile } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/onboarding");
  const targets = computeTargets(toProfile(user));
  return (
    <AppShell
      name={user.name}
      goal={GOALS[user.goal]?.label ?? ""}
      reminders={{
        wakeTime: user.wakeTime,
        sleepTime: user.sleepTime,
        waterMl: targets.water,
        trainingDays: user.trainingDays,
        trainingTime: user.trainingTime,
      }}
    >
      {children}
    </AppShell>
  );
}
