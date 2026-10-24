import Link from "next/link";
import { Leaf, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="card w-full max-w-md p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white">
          <Leaf size={26} />
        </div>
        <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-emerald-600">Erro 404</p>
        <h1 className="mt-1 text-2xl font-bold">Página não encontrada</h1>
        <p className="mt-2 text-sm text-slate-500">
          O endereço que você tentou abrir não existe ou foi movido.
        </p>
        <Link href="/" className="btn-primary mx-auto mt-6">
          <Compass size={16} /> Voltar ao início
        </Link>
      </div>
    </main>
  );
}
