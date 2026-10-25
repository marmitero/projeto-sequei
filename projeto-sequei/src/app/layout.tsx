import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "FitVida — Seu acompanhamento fitness personalizado",
  description: "Alimentação, treinos, hidratação, métricas e receitas low-carb condicionados ao seu perfil.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "FitVida", statusBarStyle: "default" },
  icons: { icon: "/icon.png", apple: "/icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#059669",
};

// Aplica o tema salvo antes da primeira pintura (evita "piscada" claro→escuro).
const themeScript = `(function(){try{var t=localStorage.getItem("fitvida-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}if(t==="dark"){document.documentElement.classList.add("dark")}}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans text-slate-900 antialiased">
        {children}
        <script dangerouslySetInnerHTML={{ __html: `if ("serviceWorker" in navigator) { window.addEventListener("load", function () { navigator.serviceWorker.register("/sw.js").catch(function () {}); });` + "}" }} />
      </body>
    </html>
  );
}
