import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // E2E compartilha servidor/banco: arquivos em sequência para evitar
    // colisão de rate limiting e dados de teste.
    fileParallelism: false,
    pool: "forks",
  },
});
