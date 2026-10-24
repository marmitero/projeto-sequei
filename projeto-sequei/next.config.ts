import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // O app roda atrás de reverse proxy no preview (host *.e2b.app). Sem esta
      // allowlist, Server Actions são abortadas quando o proxy faz Host (127.0.0.1)
      // divergir do Origin do navegador ("Invalid Server Actions request").
      allowedOrigins: ["*.e2b.app"],
    },
  },
};

export default nextConfig;
