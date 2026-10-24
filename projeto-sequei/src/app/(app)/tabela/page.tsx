import { Table2 } from "lucide-react";
import { getContext } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import FoodTable from "./FoodTable";

export default async function TabelaPage() {
  const { profile } = await getContext();
  return (
    <>
      <PageHeader title="Tabela Nutricional" subtitle="Base TACO (UNICAMP) + USDA. Compare alimentos, ordene por nutriente e simule porções." icon={<Table2 size={22} />} />
      <FoodTable profile={profile} />
    </>
  );
}
