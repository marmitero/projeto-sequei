"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { resetAccount } from "@/app/actions";

export default function ResetButton() {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      className="btn-outline !text-rose-600"
      disabled={pending}
      onClick={() => {
        if (!confirm("Apagar seu perfil e todo o histórico? Essa ação não pode ser desfeita.")) return;
        start(async () => {
          await resetAccount();
          router.push("/onboarding");
        });
      }}
    >
      <Trash2 size={16} /> {pending ? "Apagando..." : "Apagar dados"}
    </button>
  );
}
