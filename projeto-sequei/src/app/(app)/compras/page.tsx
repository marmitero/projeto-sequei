import { ShoppingCart } from "lucide-react";
import { getT } from "@/lib/i18n-server";
import { getContext } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { generateShoppingList } from "@/lib/shopping";
import ShoppingList from "./ShoppingList";

export default async function ComprasPage() {
  const t = await getT();
  const { user, profile, targets, today } = await getContext();
  const groups = generateShoppingList(profile, targets, user.id, today, 7);
  const totalItems = groups.reduce((a, g) => a + g.items.length, 0);
  return (
    <>
      <PageHeader
        title={t("pages.shopping")}
        subtitle={t("pages.shoppingSub", { n: totalItems })}
        icon={<ShoppingCart size={22} />}
      />
      <ShoppingList groups={groups} weekKey={today} />
    </>
  );
}
