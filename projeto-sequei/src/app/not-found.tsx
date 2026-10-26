import Link from "next/link";
import { Leaf, Compass } from "lucide-react";
import { getT } from "@/lib/i18n-server";

export default async function NotFound() {
  const t = await getT();
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="card w-full max-w-md p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white">
          <Leaf size={26} />
        </div>
        <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">{t("nf.code")}</p>
        <h1 className="mt-1 text-2xl font-bold">{t("nf.title")}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {t("nf.body")}
        </p>
        <Link href="/" className="btn-primary mx-auto mt-6">
          <Compass size={16} /> {t("nf.back")}
        </Link>
      </div>
    </main>
  );
}
