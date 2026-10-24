// PostgreSQL embutido para testes locais — usado pelo iniciar-local.mjs quando não
// há Docker nem PostgreSQL instalado. Mantém o banco vivo enquanto o processo existir.
import path from "node:path";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOLS_DIR = path.join(APP_DIR, ".tools");
const require = createRequire(path.join(TOOLS_DIR, "index.js"));
const EmbeddedPostgres = require("embedded-postgres").default ?? require("embedded-postgres");

const dataDir = path.join(TOOLS_DIR, "pgdata");
const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "postgres",
  password: "postgres",
  port: 5432,
  persistent: true,
});

if (!existsSync(path.join(dataDir, "PG_VERSION"))) {
  await pg.initialise();
}
await pg.start();
try {
  await pg.createDatabase("app_db");
} catch {
  // já existe
}
console.log("PG up");

const shutdown = async () => {
  try {
    await pg.stop();
  } finally {
    process.exit(0);
  }
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
// mantém o processo vivo
setInterval(() => {}, 60_000);
