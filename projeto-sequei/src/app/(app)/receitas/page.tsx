import { ChefHat } from "lucide-react";
import { getT } from "@/lib/i18n-server";
import { getContext, foodsOn, sumMacros } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import RecipeBrowser from "./RecipeBrowser";

export default async function ReceitasPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const t = await getT();
  const { user, profile, targets, today } = await getContext();
  const sp = await searchParams;
  const eaten = sumMacros(await foodsOn(user.id, today));
  return (
    <>
      <PageHeader title={t("pages.recipes")} subtitle={t("pages.recipesSub")} icon={<ChefHat size={22} />} />
      <RecipeBrowser
        profile={profile}
        today={today}
        initial={sp.r ?? null}
        remaining={{ kcal: targets.kcal - eaten.kcal, protein: targets.protein - eaten.protein, carbs: targets.carbs - eaten.carbs, fat: targets.fat - eaten.fat }}
      />
    </>
  );
}
