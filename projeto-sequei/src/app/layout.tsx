import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "FitVida — Seu acompanhamento fitness personalizado",
  description: "Alimentação, treinos, hidratação, métricas e receitas low-carb condicionados ao seu perfil.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#059669",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-sans text-slate-900 antialiased">{children}</body>
    </html>
  );
}
