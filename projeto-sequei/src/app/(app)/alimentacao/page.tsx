import { Utensils } from "lucide-react";
import { getContext, foodsOn } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import FoodDiary from "./FoodDiary";

export default async function AlimentacaoPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { user, profile, targets, today } = await getContext();
  const sp = await searchParams;
  const date = sp.d && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) ? sp.d : today;
  const entries = await foodsOn(user.id, date);
  return (
    <>
      <PageHeader title="Alimentação" subtitle="Registre o que comeu, veja seus macros e siga um cardápio feito para você." icon={<Utensils size={22} />} />
      <FoodDiary
        date={date}
        today={today}
        profile={profile}
        targets={targets}
        seed={user.id}
        entries={entries.map((e) => ({ id: e.id, meal: e.meal, name: e.name, grams: e.grams, portionLabel: e.portionLabel, kcal: e.kcal, protein: e.protein, carbs: e.carbs, fat: e.fat, fiber: e.fiber }))}
      />
    </>
  );
}
