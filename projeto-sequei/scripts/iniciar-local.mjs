#!/usr/bin/env node
// Inicializador local do FitVida (Windows/Linux/macOS) — chamado pelo executar.bat.
// Fluxo: .env → banco (PostgreSQL local/Docker/embutido) → migrações → seed →
// build → servidor → abre o navegador.
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOLS_DIR = path.join(APP_DIR, ".tools");
const DEFAULT_URL = "postgresql://postgres:postgres@127.0.0.1:5432/app_db";
const require = createRequire(import.meta.url);

const C = { dim: "\x1b[2m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", bold: "\x1b[1m", off: "\x1b[0m" };
const log = (m) => console.log(`${C.bold}[fitvida]${C.off} ${m}`);
const warn = (m) => console.log(`${C.bold}[fitvida]${C.yellow} ${m}${C.off}`);
const ok = (m) => console.log(`${C.bold}[fitvida]${C.green} ${m}${C.off}`);
const fail = (m) => {
  console.error(`\n${C.bold}[fitvida]${C.red} ${m}${C.off}`);
  process.exit(1);
};

// ---------- 1. Node.js ----------
const major = Number(process.versions.node.split(".")[0]);
if (major < 20) {
  fail(`Node.js ${process.versions.node} encontrado. O FitVida precisa da versão 20 ou superior — instale em https://nodejs.org/ e execute de novo.`);
}
if (!existsSync(path.join(APP_DIR, "node_modules"))) {
  fail("Dependências não instaladas. Rode `npm install` na pasta projeto-sequei (ou execute o executar.bat na raiz).");
}

// ---------- 2. .env ----------
const envPath = path.join(APP_DIR, ".env");
if (!existsSync(envPath)) {
  writeFileSync(envPath, `# Gerado automaticamente pelo executar.bat — ajuste se o seu PostgreSQL usar outras credenciais.\nDATABASE_URL=${DEFAULT_URL}\n`);
  log("Arquivo .env criado com a URL padrão do banco.");
}
const envFile = readFileSync(envPath, "utf8");
const url = (process.env.DATABASE_URL || /DATABASE_URL=(.+)/.exec(envFile)?.[1]?.trim() || DEFAULT_URL).replace(/["']/g, "");
const env = { ...process.env, DATABASE_URL: url };

// ---------- 3. Banco de dados ----------
let pgChild = null;

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { stdio: "inherit", shell: true, cwd: APP_DIR, env, ...opts });
}

async function probe(connectionString) {
  const client = new (require("pg").Client)({ connectionString, connectionTimeoutMillis: 4000 });
  try {
    await client.connect();
    await client.query("SELECT 1");
    await client.end();
    return { ok: true };
  } catch (e) {
    try {
      await client.end();
    } catch {}
    return { ok: false, code: e.code ?? (e.code === undefined && /ECONNREFUSED/.test(String(e)) ? "ECONNREFUSED" : "OUTRO"), message: String(e.message ?? e) };
  }
}

async function createDatabase(connectionString) {
  const target = new URL(connectionString).pathname.replace(/^\//, "") || "app_db";
  const admin = new URL(connectionString);
  admin.pathname = "/postgres";
  const client = new (require("pg").Client)({ connectionString: admin.toString(), connectionTimeoutMillis: 5000 });
  await client.connect();
  await client.query(`CREATE DATABASE "${target.replace(/"/g, '""')}"`);
  await client.end();
  ok(`Banco "${target}" criado.`);
}

async function waitForDb(ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const r = await probe(url);
    if (r.ok || r.code === "3D000") return r;
    await new Promise((r2) => setTimeout(r2, 1000));
  }
  return { ok: false, code: "TIMEOUT" };
}

function haveDocker() {
  return spawnSync("docker", ["info"], { stdio: "ignore", shell: true }).status === 0;
}

function ensureDockerPg() {
  log("Docker encontrado — usando um contêiner PostgreSQL (fitvida-pg)...");
  if (spawnSync("docker", ["start", "fitvida-pg"], { stdio: "ignore", shell: true }).status === 0) return true;
  const r = spawnSync(
    "docker",
    ["run", "-d", "--name", "fitvida-pg", "-p", "5432:5432", "-e", "POSTGRES_PASSWORD=postgres", "-e", "POSTGRES_DB=app_db", "postgres:16-alpine"],
    { stdio: "inherit", shell: true },
  );
  return r.status === 0;
}

async function ensureEmbeddedPg() {
  log("Tentando PostgreSQL embutido (baixado só na primeira vez, ~40 MB)...");
  mkdirSync(TOOLS_DIR, { recursive: true });
  const pj = path.join(TOOLS_DIR, "package.json");
  if (!existsSync(pj)) writeFileSync(pj, JSON.stringify({ name: "fitvida-pg-tools", private: true }));
  if (!existsSync(path.join(TOOLS_DIR, "node_modules", "embedded-postgres"))) {
    const r = spawnSync("npm", ["install", "embedded-postgres@18.4.0-beta.17"], { stdio: "inherit", shell: true, cwd: TOOLS_DIR });
    if (r.status !== 0) return null;
  }
  const child = spawn(process.execPath, [path.join(APP_DIR, "scripts", "keep-pg-local.mjs")], {
    stdio: ["ignore", "pipe", "inherit"],
    cwd: APP_DIR,
    env,
  });
  return await new Promise((resolve) => {
    let out = "";
    const done = (v) => {
      clearTimeout(timer);
      resolve(v);
    };
    const timer = setTimeout(() => done(child), 30_000);
    child.stdout.on("data", (d) => {
      out += d;
      if (out.includes("PG up")) done(child);
    });
    child.on("exit", () => done(null));
  });
}

async function ensureDatabase() {
  log(`Verificando o banco de dados (${url.replace(/:[^:@/]+@/, ":***@")})...`);
  let r = await probe(url);
  if (r.ok) {
    ok("PostgreSQL acessível.");
    return;
  }
  if (r.code === "3D000") {
    await createDatabase(url);
    return;
  }
  if (r.code === "28P01" || r.code === "28000") {
    fail(
      `Já existe um PostgreSQL na porta 5432, mas a autenticação falhou.\n` +
        `Abra o arquivo projeto-sequei\\.env e ajuste DATABASE_URL com o usuário/senha do seu PostgreSQL.\n` +
        `Detalhe: ${r.message}`,
    );
  }
  warn(`Sem PostgreSQL acessível (${r.code}). Procurando alternativas...`);

  if (haveDocker() && ensureDockerPg()) {
    r = await waitForDb(60_000);
    if (r.ok || r.code === "3D000") {
      if (r.code === "3D000") await createDatabase(url);
      ok("PostgreSQL no Docker pronto.");
      return;
    }
    warn("O contêiner do Docker não respondeu a tempo.");
  }

  pgChild = await ensureEmbeddedPg();
  if (pgChild) {
    r = await waitForDb(60_000);
    if (r.ok || r.code === "3D000") {
      if (r.code === "3D000") await createDatabase(url);
      ok("PostgreSQL embutido pronto.");
      return;
    }
  }
  fail(
    "Não foi possível iniciar um banco de dados.\n" +
      "Instale o PostgreSQL (https://www.postgresql.org/download/windows/) ou o Docker Desktop (https://www.docker.com/products/docker-desktop/)\n" +
      "e execute o executar.bat de novo — ou crie o arquivo projeto-sequei\\.env apontando para um banco existente.",
  );
}

// ---------- 4. Porta do servidor ----------
async function pickPort() {
  for (const p of [3000, 3001, 3002, 3003]) {
    const busy = await fetch(`http://127.0.0.1:${p}/`, { signal: AbortSignal.timeout(800) })
      .then(() => true)
      .catch((e) => e?.name === "TimeoutError" || e?.name === "AbortError");
    if (!busy) return p;
  }
  return 3000;
}

function openBrowser(target) {
  const cmd =
    process.platform === "win32"
      ? ["cmd", ["/c", "start", "", target]]
      : process.platform === "darwin"
        ? ["open", [target]]
        : ["xdg-open", [target]];
  try {
    const ch = spawn(cmd[0], cmd[1], { detached: true, stdio: "ignore" });
    // erro assíncrono (ex.: sem navegador no servidor) não pode derrubar o processo
    ch.on("error", () => warn(`Não foi possível abrir o navegador automaticamente — acesse ${target} manualmente.`));
    ch.unref();
  } catch {
    warn(`Não foi possível abrir o navegador automaticamente — acesse ${target} manualmente.`);
  }
}

async function waitAndOpen(target) {
  for (let i = 0; i < 120; i++) {
    const up = await fetch(target, { signal: AbortSignal.timeout(1500) })
      .then(() => true)
      .catch(() => false);
    if (up) {
      log(`Abrindo o navegador em ${target} ...`);
      openBrowser(target);
      return;
    }
    await new Promise((r) => setTimeout(r, 700));
  }
}

// ---------- fluxo principal ----------
async function main() {
  await ensureDatabase();

  log("Aplicando migrações do banco (drizzle)...");
  if (run("npm", ["run", "db:migrate"]).status !== 0) fail("Falha ao aplicar as migrações. Veja os erros acima.");

  log("Criando dados de exemplo (idempotente)...");
  if (run("npm", ["run", "db:seed"]).status !== 0) warn("Seed não rodou — o app funciona sem os dados de exemplo.");

  log("Gerando build de produção (pode levar 1-2 minutos na primeira vez)...");
  let modo = "produção";
  let args;
  if (run("npm", ["run", "build"]).status === 0) {
    args = ["run", "start", "--", "-p"];
  } else {
    warn("Build falhou — iniciando em modo de desenvolvimento (npm run dev).");
    modo = "desenvolvimento";
    args = ["run", "dev", "--", "-p"];
  }

  const port = await pickPort();
  const target = `http://localhost:${port}`;
  log(`Iniciando o servidor (${modo}) em ${target} — Ctrl+C para encerrar.`);
  if (port !== 3000) warn(`A porta 3000 estava ocupada; usando ${port}.`);

  console.log(`
${C.green}--------------------------------------------
  Conta demo para testes:
    e-mail:  demo@fitvida.app
    senha:   demo1234
--------------------------------------------${C.off}
`);

  const server = spawn("npm", [...args, String(port)], { stdio: "inherit", shell: true, cwd: APP_DIR, env });
  waitAndOpen(target);

  server.on("exit", (code) => {
    pgChild?.kill();
    process.exit(code ?? 0);
  });
  const bye = () => {
    pgChild?.kill();
    process.exit(0);
  };
  process.on("SIGINT", bye);
  process.on("SIGTERM", bye);
}

main().catch((e) => fail(String(e?.stack ?? e)));
