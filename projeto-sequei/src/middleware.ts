import { NextResponse, type NextRequest } from "next/server";

// Headers de segurança básicos ("helmet-like") para todas as respostas.
export function middleware(_req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  // Proteção contra clickjacking via CSP (supera X-Frame-Options); permite o
  // preview em iframe do ambiente de demonstração (*.e2b.app).
  res.headers.set("Content-Security-Policy", "frame-ancestors 'self' https://*.e2b.app");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set("X-DNS-Prefetch-Control", "off");
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
