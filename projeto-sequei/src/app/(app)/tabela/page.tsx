import { Table2 } from "lucide-react";
import { getT } from "@/lib/i18n-server";
import { getContext } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import FoodTable from "./FoodTable";

export default async function TabelaPage() {
  const t = await getT();
  const { profile } = await getContext();
  return (
    <>
      <PageHeader title={t("pages.foodTable")} subtitle={t("pages.foodTableSub")} icon={<Table2 size={22} />} />
      <FoodTable profile={profile} />
    </>
  );
}
