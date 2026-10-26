# Sessão de validação e testes — relatório

Data: **2026-10-24** · Branch: `arena/54910e50-projeto-sequei` · Executor: agente Arena (ambiente Linux, Node 22.22.3, npm 10.9.8, PostgreSQL 18.4 embarcado em `127.0.0.1:5432`).

Escopo: validação estática (typecheck, lint, build), provisionamento do banco (`drizzle-kit push`), testes de unidade das regras de negócio puras e testes E2E das rotas + Server Actions via HTTP (protocolo `Next-Action`, sem navegador). Os harnesses ficaram **fora do repositório** (`/home/user/pgtools`), para não poluir o código do app.

---

## 1. Resumo executivo

| Etapa | Resultado na sessão | Situação após a Fase 0 (mesma data) |
|---|---|---|
| `npm install` | ✅ OK | ✅ OK |
| `npx drizzle-kit push` (schema) | ✅ 5 tabelas criadas | ✅ OK (via `drizzle.config.ts` com env) |
| `npm run typecheck` | ✅ **0 erros** | ✅ **0 erros** |
| `npm run lint` | ❌ **8 erros** (§3) | ✅ **0 erros** (corrigidos) |
| `npm run build` (sem `DATABASE_URL`) | ❌ falha na coleta de páginas (§4) | ✅ **passa** (pool lazy) |
| `npm run build` (com `DATABASE_URL`) | ✅ 10 rotas compiladas | ✅ 10 rotas compiladas |
| Testes de unidade (regras de negócio) | ✅ **32/32** — §5 | ✅ **32/32** (re-executados) |
| Testes E2E (rotas + Server Actions) | ✅ **24/24** — §6 | ✅ **28/28** (com novos casos P0 — §10) |
| Smoke do servidor de produção (`next start`) | ✅ — §6 | ✅ (re-executado com novo build) |

**Veredito: o app está funcional.** Todos os fluxos principais (criar perfil, registrar comida/receita/item manual, água, treino, métricas com upsert e atualização automática de peso, navegação entre telas, reset de conta) funcionaram de ponta a ponta. Os problemas encontrados eram de **qualidade/robustez de engenharia** — todos os itens P0 foram corrigidos e revalidados (§10); o restante está no roadmap de [PLANEJAMENTO.md](./PLANEJAMENTO.md).

## 2. Ambiente de teste

- Node 22.22.3 · npm 10.9.8 · Next.js 16.2.6 (Turbopack) · TypeScript 5.9.3 · ESLint 9.39.
- PostgreSQL 18.4 (`embedded-postgres` via npm, sem root no sandbox) em `127.0.0.1:5432`, banco `app_db`.
- Servidor de produção: `next start -H 0.0.0.0 -p 3000` com `DATABASE_URL` apontando para o banco de teste.

## 3. Typecheck e Lint

- **`tsc --noEmit`: limpo** (strict mode).
- **ESLint na sessão inicial: 8 erros, 0 warnings** (regras novas de `react-hooks`/React Compiler do `eslint-config-next` 16) — **todos corrigidos na Fase 0** (§10):

| Arquivo | Regra | Onde | Correção aplicada |
|---|---|---|---|
| `src/app/(app)/tabela/FoodTable.tsx` | `react-hooks/static-components` — componente `H` criado dentro do render (7×) | Cabeçalho ordenável da tabela | Componente extraído para `SortHead` (módulo) com props |
| `src/app/(app)/hidratacao/WaterTracker.tsx:70` | "Cannot reassign variable after render completes" — `acc += ml` em closure do `useMemo` | Cronograma de copos | `Array.from` com acumulador mutável → `for` + `reduce` puro |

## 4. Build de produção

- **Sem `DATABASE_URL` (sessão inicial)**: `next build` **falhava** em "Collecting page data" com `Error: DATABASE_URL is required` (o módulo `src/db/index.ts` validava a env no import, antes mesmo de qualquer query — afetava a rota `/api/health`). **Corrigido na Fase 0**: o `db` é materializado sob demanda (Proxy que cria o pool na 1ª query), então o build não exige mais banco — apenas o runtime.
- **Com `DATABASE_URL`**: build **OK em ~15 s**. Rotas: `/_not-found` estática; `/`, `/alimentacao`, `/exercicios`, `/hidratacao`, `/metricas`, `/onboarding`, `/perfil`, `/receitas`, `/tabela`, `/api/health` dinâmicas (comportamento esperado: sessão por cookie).

## 5. Testes de unidade — 32/32 ✅

Harness em `tsx` importando os módulos puros (`calc`, `foods`, `mealplan`, `exercises`, `recipes`). Cobertura e resultados:

**Cálculos (`calc.ts`) — 12 testes**
- Idade, IMC + 6 classificações, % gordura Navy (M/F/medida faltando).
- `computeTargets` conferido **contra valores calculados à mão** (Mifflin-St Jeor + fator 1,375 + déficit 18%): BMR/TDEE/kcal batem; macros fecham ±5% com as kcal; proteína dentro de 1,4–2,2 g/kg; fibras ≥ 15; água múltipla de 50.
- Piso calórico (1200 kcal F) com aviso; gestante/lactante sem déficit (+300/+450); renal 0,8 g/kg; cetogênica ~30 g de carbo; `weeksToGoal` coerente (5–200 semanas); `mealsFor` 3–6; datas (`todayIn`, `addDays` em viradas de mês/ano), `weekdayOf`; RNG determinístico.

**Base de alimentos (`foods.ts`) — 6 testes**
- 113 alimentos com chaves únicas, valores ≥ 0 e ao menos 1 porção; `macrosFor` proporcional; filtros de dieta (vegano/vegetariano), alergênios e aversão textual; busca com/sem acento e múltiplos termos; `bestPortion` aproxima medida caseira ("2× 1 unidade").

**Cardápio (`mealplan.ts`) — 4 testes**
- 5 refeições com itens e kcal totais ≈ meta (±25% — aleatoriedade por design); **vegano + sem lactose + sem glúten respeitado em todos os itens**; determinismo por seed + troca de opções com `override`; low-carb sem arroz branco/pão francês.

**Treinos (`exercises.ts`) — 7 testes**
- `kcalFromMet` exato (MET×peso×hora); 3 dias = seg/qua/sex com 3–8 exercícios e 60 min; 4/5/7 dias com splits corretos; iniciante só recebe nível 1; gestante sem HIIT e sem os 4 exercícios evitados; obesidade (120 kg) força cardio de baixo impacto; casa sem equipamento só recebe exercícios de peso corporal; catálogos válidos (55 exercícios, 18 METs).

**Receitas (`recipes.ts`) — 3 testes**
- 21 receitas com kcal/gramas > 0 e todos os `foodKey` de ingredientes existindo na base; incompatibilidade declarada para vegano e para restrição de lactose (com motivo); aversão textual ("frango") bloqueia a pizza de frango.

*(1 teste corrigido durante a sessão: a expectativa do dia da semana de 2026-10-24 estava errada no harness — sábado = 6; o código estava correto.)*

## 6. Testes E2E — 24/24 ✅

Método: servidor de produção real + invocação das **Server Actions pelo mesmo protocolo do navegador** (`POST` + header `Next-Action` + payload de argumentos), com verificação de HTML renderizado e comportamento de redirect. IDs das actions lidos de `.next/server/server-reference-manifest.json`.

| # | Cenário | Resultado |
|---|---|---|
| 1 | `saveProfile` cria perfil e devolve cookie `fituid` | ✅ |
| 2–3 | Dashboard renderiza com saudação e metas | ✅ |
| 4 | `addFoodEntries` alimento da base (ovo 100 g) aparece no diário | ✅ |
| 5 | `addFoodEntries` receita (pizza de frango, 1 porção) | ✅ |
| 6 | `addFoodEntries` item manual (marmita custom) | ✅ |
| 7 | `addFoodEntries` rejeita `foodKey` inexistente (erro tratado) | ✅ |
| 8–9 | `addWater` 250 ml reflete na hidratação | ✅ |
| 10–11 | `logWorkout` (força 55 min) aparece no histórico | ✅ |
| 12–13 | `saveMetric` com upsert no mesmo dia **não duplica** | ✅ |
| 14–15 | Métricas renderizam peso novo e **dashboard reflete peso atualizado** (metas recalculadas) | ✅ |
| 16–19 | `/receitas`, `/tabela`, `/perfil`, `/alimentacao?d=…` respondem 200 com cookie | ✅ |
| 20 | `addWater` com data inválida é ignorado com segurança | ✅ |
| 21 | Registros persistem entre navegações | ✅ |
| 22–23 | `resetAccount` executa e apaga a conta | ✅ |
| 24 | Pós-reset, `/` redireciona para `/onboarding` (307) | ✅ |

**Smoke extra:** `/api/health` → `{"ok":true}`; `/` sem cookie → `307 /onboarding`; `/onboarding` → 200 com o wizard. Teste negativo de identidade: action sem cookie falha com "Perfil não encontrado" (esperado).

> Nota de protocolo: as Server Actions do Next exigem `Origin` igual ao host de destino (proteção CSRF). O harness inicial falhou com `Origin: localhost` contra `127.0.0.1` — comportamento correto do framework, não bug do app.

## 7. Itens verificados no código (sem execução)

- Deletes sempre escopados por `user_id` (sem IDOR entre usuários).
- Clamps numéricos e truncamento de strings em todas as actions.
- `metrics` com índice único `(user_id, date)` + `onConflictDoUpdate`.
- Exclusões em cascata do `users` para todos os logs (reset limpa tudo).
- RNG determinístico do cardápio/treino (mesmo perfil+seed → mesmo resultado).

## 8. Como reproduzir

1. Subir PostgreSQL e criar `app_db`; `cp .env.example .env` com `DATABASE_URL`.
2. `npm install && npx drizzle-kit push`.
3. `npm run typecheck && npm run lint && npm run build` (com env exportada).
4. `npm start` e executar harness E2E (recomendação: incorporar ao repositório com Vitest + Playwright — ver [PLANEJAMENTO.md](./PLANEJAMENTO.md)).

## 9. Pendências de teste (não cobertas nesta sessão)

- Testes visuais/interação em navegador real (cliques, modais, touch) — não há navegador no sandbox.
- Carga/performance com milhares de registros; acessibilidade (foco em modais, leitores de tela).
- Comportamento com `NODE_ENV=development` (hot reload) — sessão feita em produção.
- Migrações versionadas (o repo usa apenas `drizzle-kit push`).

## 10. Revalidação após a Fase 0 (2026-10-24)

Após as correções da [Fase 0](./PLANEJAMENTO.md), toda a bateria foi re-executada no mesmo ambiente:

| Etapa | Resultado |
|---|---|
| `npm run typecheck` | ✅ 0 erros |
| `npm run lint` | ✅ **0 erros** (8 → 0) |
| `npm run build` **sem** `DATABASE_URL` | ✅ **passa** (pool lazy no `src/db/index.ts`) |
| `npx drizzle-kit push` via `drizzle.config.ts` (env) | ✅ "Changes applied"; sem env → mensagem de erro clara |
| Testes de unidade | ✅ 32/32 |
| Testes E2E | ✅ **28/28** (24 originais + 4 novos) |

**Novos casos E2E cobrindo a Fase 0:**
- 404 customizado (`/rota-que-nao-existe` → 404 com "Página não encontrada").
- `saveProfile` com enums inválidos (`goal: "invalido"`, `pace: "???"`, `diet: "xyz"`, `equipment: ["bazooka","halteres"]`, `wakeTime: "99:99"`) → não quebra e **cai nos padrões** do whitelist (meta "Emagrecer", equipamento inválido descartado).
- Redirect pós-reset preservado como **307 → /onboarding** (ver nota abaixo).

**Nota de comportamento:** um `loading.tsx` na raiz do app fazia o redirect sem cookie virar navegação client-side (HTTP 200 + stream). Decisão: manter o skeleton apenas em `(app)/loading.tsx` (onde as queries acontecem) e **não** ter `loading.tsx` na raiz — assim o redirect do layout continua sendo 307 (funciona sem JS e é mais limpo). O `error.tsx` e o `not-found.tsx` ficam na raiz.

**Itens P0 entregues:** lint zerado · build sem banco · `drizzle.config.ts` com `DATABASE_URL` do ambiente (credenciais hardcoded removidas) · `package.json` renomeado para `fitvida@0.1.0` · `error.tsx`/`(app)/loading.tsx`/`not-found.tsx` · whitelist de enums e arrays em `saveProfile`/`logWorkout` · `.gitignore`/`.env.example`/README/docs.

## 11. Revalidação após a Fase 1 (2026-10-24)

Fase 1 implementada (conta/sessão, migrações versionadas, seed, Vitest + E2E no repo, CI, export/import, rate limiting, headers). Bateria completa re-executada no mesmo ambiente:

| Etapa | Resultado |
|---|---|
| `npm run typecheck` | ✅ 0 erros |
| `npm run lint` | ✅ 0 erros |
| `npm run build` sem `DATABASE_URL` | ✅ (inclui middleware registrado) |
| `npm test` (Vitest, `tests/unit`) | ✅ **39/39** (32 portados + 7 novos: password scrypt, ratelimit) |
| Migrações em banco zerado (`npm run db:migrate`) | ✅ 6 tabelas criadas a partir do SQL versionado |
| `npm run db:seed` (idempotente) | ✅ conta demo + perfil + registros |
| `npm run test:e2e` (`tests/e2e`, servidor real) | ✅ **31/31** (18 fluxos + 13 conta/backup/segurança) |
| Headers de segurança (middleware) | ✅ `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` |
| Login da conta demo via Server Action | ✅ `fit_session` (30 d) + `fituid`, `"ok":true` |

**Novos casos E2E da Fase 1:** registro reivindicando perfil anônimo · login em "outro dispositivo" resolvendo o perfil só com a sessão · e-mail duplicado/senha curta rejeitados · senha errada · logout revogando a sessão · export JSON (perfil + histórico) e CSV por tipo (400 para tipo inválido, 401 sem sessão) · `importData` restaurando registros · rate limit de login e registro disparando · `resetAccount` de conta logada.

**Bugs reais encontrados pelos testes e corrigidos nesta fase:**
1. `requireUser()` resolvia apenas o cookie anônimo — writes falhavam para usuários logados por sessão em outro dispositivo (ex.: `importData`). Corrigido para resolver via `getUser()` (conta → cookie).
2. Links/testes de CSV apontavam para `/api/export/csv` (rota inexistente) em vez de `?format=csv` — 404. Corrigido.

**Escopo de CI:** `.github/workflows/ci.yml` roda typecheck → lint → build (sem banco) → testes unitários → `db:migrate` → `db:seed` → servidor de produção → E2E, com serviço PostgreSQL 16.

## 12. Validação da Fase 2 (2026-10-24)

Bateria final: **typecheck 0 erros · lint 0 problemas · 90/90 testes** (48 unit + 42 e2e) · build de produção OK.

### Suítes novas
- `tests/unit/features.test.ts` (9): shopping (agregação 7 dias determinística + fallback de porção), progression (parse de carga; aumento/manutenção/deload/sem sugestão), barcode (validação de código + mapeamento OFF com casos nulos), weekly (semana corrente/anterior + tendências + pctDelta).
- `tests/e2e/features.test.ts` (11): setup de perfil; meus alimentos (salvar→listar→registrar por `customId`→2 porções no export); favoritos (marcar/listar/desmarcar); exclusão remove favorito; repetir refeição (copia de ontem + origem vazia); barcode (validação + degradação graciosa offline); logWorkout com carga + painel de progressão; atalho “repetir de ontem” no HTML; `/compras` e `/metricas` renderizam; páginas novas exigem sessão (307).

### Bugs corrigidos durante os testes
1. `bestPortion` pode devolver string vazia → shopping usa fallback “N g” (teste unitário pegou o caso).
2. E2E do export: `format=json` sempre retorna o backup completo (`foodLogs`); `type` só filtra em CSV — testes ajustados ao formato real.
3. Lint (react-hooks): `FavButton` não pode ser componente criado dentro do render (virou componente de módulo; prop `key` renomeada para `id`, pois `key` é reservada do React) e a lista de compras passou a usar `useSyncExternalStore` + store de `localStorage` (sem setState síncrono em efeito).

### Limitações conhecidas do ambiente de teste
- Open Food Facts é inacessível deste sandbox (rede restrita) → apenas o caminho de degradação é coberto; a integração real usa o mesmo mapper já testado por unidade.
- Playwright segue indisponível (CDN bloqueada); a UI nova é coberta pelos e2e HTTP (HTML renderizado) + unitários da lógica pura.

## 13. Validação completa pós-Fase 2 — bugs de login/cadastro e onboarding (2026-10-24)

Solicitada pelo usuário após relatar: (a) login/cadastro não funcionava; (b) o wizard de onboarding zerava ao concluir ("Saúde e resumo") em vez de avançar. Bateria final desta rodada: **typecheck 0 · lint 0 · 93/93 testes** (48 unit + 45 e2e) · build OK · smoke de todas as rotas 200/404 conforme esperado.

### Causas-raiz encontradas
1. **CSRF de Server Actions atrás de reverse proxy (reproduzido)**: com `Origin: https://<host-preview>` e `Host: 127.0.0.1:3000` (proxy reescrevendo o Host), o Next abortava a action — `Invalid Server Actions request` / *"x-forwarded-host ... does not match origin ... Aborting the action"*. Login/cadastro e o salvamento do wizard falhavam de forma invisível (o `AuthForm` não tinha `try/catch` nem mensagem de erro). → **corrigido** com `experimental.serverActions.allowedOrigins: ["*.e2b.app"]` (`next.config.ts`).
2. **Cookies de identidade incompatíveis com iframe/proxy**: `SameSite=Lax` não é gravado em contexto de iframe cross-site (preview) e proxies podem descartar `Set-Cookie` de respostas de Server Action. Sem o cookie, o `router.push("/")` após salvar/entrar voltava para `/onboarding` com o formulário **zerado** — exatamente o "reset" relatado. → **corrigido em camadas**:
   - `authCookieOpts()`: em requisições https → `SameSite=None; Secure`; em http (dev local) → `SameSite=Lax` (`src/lib/session.ts`);
   - fallback cliente `persistAuthCookies()` (`src/lib/clientCookies.ts`): as actions devolvem `id`/`fituid`/`session` e o cliente grava via `document.cookie` apenas se o cookie não existir (a escrita é ignorada pelo navegador quando o cookie HttpOnly já está gravado — inofensivo).
3. **Silêncio em falhas de autenticação**: `AuthForm` sem `try/catch` nem `<form>` (Enter não enviava; erro de rede/action sumia). → **corrigido**: `<form onSubmit>`, `role="alert"` no erro, mensagem explícita em exceção.
4. **Onboarding descartava dados ao reentrar**: `/onboarding` sempre montava o wizard vazio. → **corrigido**: pré-preenche com o perfil existente (`initial={toProfile(user)}`).
5. **`X-Frame-Options: DENY` no middleware** bloqueava embedding do preview. → substituído por `Content-Security-Policy: frame-ancestors 'self' https://*.e2b.app` (mantém proteção contra clickjacking e libera o preview).

### Correções de ambiente (sandbox, não do app)
- `node_modules`, `.next` e o Postgres embutido são descartados entre turnos do agente: `npm install` + `npm run build` + `node keep-pg.mjs` (recriado em `/home/user/pgtools`) + `drizzle-kit migrate` antes de validar.

### Cobertura nova
- `tests/e2e/proxy.test.ts` (3): action aceita com `Origin` de preview e `Host` reescrito (sem a allowlist seria 500); `Set-Cookie` com `SameSite=None; Secure` em https; registro/login devolvem `session` para o fallback de cookie.

### Validação manual (HTTP, protocolo real das Server Actions)
- Fluxo do wizard com **os DEFAULTs exatos do formulário** (`trainingTime: "noite"`, `climate: "temperado"` — confirmados aceitos pelo servidor): salvar → `200 ok:true` + `fituid` → `GET /` = dashboard; `GET /onboarding` pré-preenche o nome.
- Cadastro → logout → login: `fit_session` emitido/revogado corretamente; login em "outro dispositivo" (só sessão) sincroniza `fituid` e abre o dashboard. Conta sem perfil cai no onboarding (comportamento correto).
- Matriz de `Origin`/`Host`/`X-Forwarded-Host` após a correção: os 3 cenários passam do CSRF.
- Smoke: `/`, `/alimentacao`, `/compras`, `/exercicios`, `/hidratacao`, `/metricas`, `/receitas`, `/tabela`, `/perfil`, `/login`, `/cadastro`, `/onboarding`, `/api/health`, `/api/export` → 200; rota inexistente → 404; headers: CSP `frame-ancestors` presente, `nosniff` presente.

## 14. Validação da Fase 3 — engajamento (2026-10-25)

Bateria final desta rodada: **typecheck 0 · lint 0 · 106/106 testes** (55 unit + 51 e2e) · build de produção OK · smoke PWA (manifest/sw/ícone 200).

### Suítes novas
- **Unit `tests/unit/engagement.test.ts` (7)**: streaks (terminando hoje/ontem, recorde), marcos (patamares + progresso), agenda de lembretes (distribuição de água na janela acordar–dormir, treino por período/semana, pesagem semanal, `dueSlots` por dia da semana), parsers de saúde (Apple Health kg/lb + gordura + sono com datas HealthKit; CSV de peso com `,`/`;` e decimal vírgula; detecção automática de formato e arquivos sem dados).
- **E2E `tests/e2e/engagement.test.ts` (6)**: fotos (upload multipart → lista → download → exclusão → 404), import de saúde (CSV → 2 dias de métricas visíveis em `/metricas`), PWA (`manifest.webmanifest` com `standalone`, `sw.js` com cache `fitvida-v1`, `/icon.png`), modo escuro (script anti-FOUC `fitvida-theme` no HTML) + gamificação no dashboard ("Sequências e marcos"), botão de lembretes renderizado.

### Notas de implementação
- `bytea` não existe no drizzle-orm 0.45 → `customType` local em `src/db/schema.ts` (migração `0002_charming_grim_reaper.sql`).
- Datas do HealthKit (`2026-10-20 23:10:00 -0300`) exigem parser próprio (o `Date.parse` padrão falha no offset sem dois-pontos).
- Upload/import por **route handlers** (`/api/photos`, `/api/health-import`) — server actions têm limite de corpo de 1 MB, incompatível com fotos/exports.
- `react-hooks/set-state-in-effect` (lint): ThemeToggle e ReminderToggle via `useSyncExternalStore`; fotos iniciais vêm do servidor (props) em vez de fetch em effect.

### Limitações conhecidas do ambiente de teste
- Notificações/disparo de lembretes dependem de API do navegador (`Notification`) — testado apenas o agendamento puro e a renderização do toggle; o disparo real precisa de navegador.
- Web Push (app fechado) e OAuth Google Fit/Apple Health não implementados (documentado como futuro no PLANEJAMENTO).
- Critério de produto "retenção D30; streak médio ≥ 5 dias" não é mensurável no sandbox; a lógica de streak está coberta por unit tests.

## 15. Validação da Fase 4 — escala, primeira leva (2026-10-25)

Bateria final: **typecheck 0 · lint 0 · 121/121 testes** (63 unit + 58 e2e) · build de produção OK.

### Suítes novas
- **Unit `tests/unit/fase4.test.ts` (8)**: `clampTargets` (pisos 1200/1500, tetos), `weeklyWeightRate` (≥4 pontos em ≥14 dias), regras do coach (+100/−100 kcal, água realista com clamp, registro baixo, treino baixo, "manter" quando tudo ok), `parseIngredientLine` (—, vírgula, espaço) e `normalizeRecipeInput` (erros + happy path).
- **E2E `tests/e2e/fase4.test.ts` (7)**: comunidade (publicar → galeria com autor → curtir/descurtir → excluir → some; receita alheia **não** pode ser excluída), planos compartilhados (criar → token de 32 hex → página pública sem cookie com nome do link + "somente leitura" + plano semanal → revogar → 404), ajuste de metas (seção em `/metricas` → aplicar override → "Restaurar metas automáticas" aparece → limpar → some), navegação com `/comunidade`.

### Armadilhas encontradas (registradas para não repetir)
- **Feed global polui asserts**: execuções repetidas acumulam receitas de usuários anteriores — usar nomes únicos (`Date.now()`) em testes de listagem/exclusão.
- **SSR do React insere `<!-- -->`** entre texto e interpolações (`por {autor}` → `por <!-- -->Nome`) — asserts de `toContain` devem pegar só a interpolação ou um trecho sem mistura.
- `npx vitest run -t "trecho"` **pula o `it` de setup** e deixa `cookie` vazio — rodar sempre o arquivo completo.
- drizzle-orm 0.45: `workoutLogs.title` (não `name`); `createShare` precisa devolver `id` (revogação).

## 16. Validação do i18n (2026-10-26)

- `tests/unit/i18n.test.ts` (7): paridade exata de chaves entre os 5 dicionários, variáveis `{{var}}` idênticas, sem valores vazios, `translate` com interpolação e fallback, cobertura das chaves usadas.
- `tests/e2e/i18n.test.ts` (5): `/onboarding` renderiza nos 5 idiomas conforme o cookie `fitvida-lang` (pt por padrão; cookie inválido cai no pt); dashboard autenticado traduz ("Peso atual" ↔ "Current weight" ↔ "当前体重"); toggles de idioma/tema na 1ª tela do cadastro; regressão de vazamento de chaves/`{{ }}` crus em 9 rotas autenticadas; dashboard sem chaves de emblemas cruas.
- Bateria completa: **70 unit + 60 e2e = 130/130** (os 121 testes anteriores permanecem verdes com o locale padrão pt-BR; textos PT da UI foram ajustados para os textos originais já cobertos pelos asserts).

## 17. Validação da família com conta vinculada (2026-10-26)

- `tests/e2e/familia.test.ts` (3): criação de grupo, convite por código (hex 32, uso único — segundo uso falha), código inválido rejeitado, overview com papéis, permissões (membro não convida nem remove; dono não sai; dono remove; membro sai).
- Bateria completa: **70 unit + 63 e2e = 133/133**.

## 18. Validação estilo usuário (2026-10-26)

- Relatório completo: `docs/VALIDACAO-USUARIO.md` (método, bugs encontrados e corrigidos, limitações conhecidas e sugestões de sistema/UX).
- Correções validadas: toggles de idioma/tema na 1ª tela do cadastro; 17 pontos de chaves i18n cruas em 11 telas; variáveis `{{ }}` em `/alimentacao`, `/hidratacao` e dashboard; chaves de emblemas (`game.badge.*`) adicionadas aos 5 dicionários; textos fixos PT em `/exercicios` e `/receitas` convertidos (`wp.*`, `prog.*`).
- Bateria completa: **70 unit + 66 e2e = 136/136**.
