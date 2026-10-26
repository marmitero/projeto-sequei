import { Users } from "lucide-react";
import { desc, eq, sql } from "drizzle-orm";
import { getT } from "@/lib/i18n-server";
import { db } from "@/db";
import { communityRecipeLikes, communityRecipes } from "@/db/schema";
import { getContext } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import CommunityBoard from "./CommunityBoard";

export const dynamic = "force-dynamic";

export default async function ComunidadePage() {
  const t = await getT();
  const { user } = await getContext();
  const [rows, likes, mine] = await Promise.all([
    db
      .select({
        id: communityRecipes.id,
        userId: communityRecipes.userId,
        name: communityRecipes.name,
        description: communityRecipes.description,
        ingredients: communityRecipes.ingredients,
        steps: communityRecipes.steps,
        tags: communityRecipes.tags,
        kcal: communityRecipes.kcal,
        protein: communityRecipes.protein,
        carbs: communityRecipes.carbs,
        fat: communityRecipes.fat,
        author: sql<string>`coalesce((select name from users where id = ${communityRecipes.userId}), 'Alguém')`,
      })
      .from(communityRecipes)
      .orderBy(desc(communityRecipes.createdAt))
      .limit(100),
    db.select({ recipeId: communityRecipeLikes.recipeId, count: sql<number>`count(*)` }).from(communityRecipeLikes).groupBy(communityRecipeLikes.recipeId),
    db.select({ recipeId: communityRecipeLikes.recipeId }).from(communityRecipeLikes).where(eq(communityRecipeLikes.userId, user.id)),
  ]);

  const likeCount = new Map(likes.map((l) => [l.recipeId, Number(l.count)]));
  const liked = new Set(mine.map((m) => m.recipeId));
  const recipes = rows.map((r) => ({ ...r, likeCount: likeCount.get(r.id) ?? 0, likedByMe: liked.has(r.id), isMine: r.userId === user.id }));

  return (
    <div className="space-y-6">
      <PageHeader title={t("pages.community")} subtitle={t("pages.communitySub")} icon={<Users size={22} />} />
      <CommunityBoard recipes={recipes} />
    </div>
  );
}
