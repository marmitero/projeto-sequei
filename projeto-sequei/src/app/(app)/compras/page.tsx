import { ShoppingCart } from "lucide-react";
import { getContext } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { generateShoppingList } from "@/lib/shopping";
import ShoppingList from "./ShoppingList";

export default async function ComprasPage() {
  const { user, profile, targets, today } = await getContext();
  const groups = generateShoppingList(profile, targets, user.id, today, 7);
  const totalItems = groups.reduce((a, g) => a + g.items.length, 0);
  return (
    <>
      <PageHeader
        title="Lista de compras"
        subtitle={`Gerada do seu cardápio dos próximos 7 dias — ${totalItems} itens para manter sua dieta em dia.`}
        icon={<ShoppingCart size={22} />}
      />
      <ShoppingList groups={groups} weekKey={today} />
    </>
  );
}
