# Sessão de validação e testes — relatório

Data: **2026-10-24** · Branch: `arena/54910e50-projeto-sequei` · Executor: agente Arena (ambiente Linux, Node 22.22.3, npm 10.9.8, PostgreSQL 18.4 embarcado em `127.0.0.1:5432`).

Escopo: validação estática (typecheck, lint, build), provisionamento do banco (`drizzle-kit push`), testes de unidade das regras de negócio puras e testes E2E das rotas + Server Actions via HTTP (protocolo `Next-Action`, sem navegador). Os harnesses ficaram **fora do repositório** (`/home/user/pgtools`), para não poluir o código do app.

---

## 1. Resumo executivo

| Etapa | Resultado |
|---|---|
| `npm install` | ✅ OK |
| `npx drizzle-kit push` (schema) | ✅ 5 tabelas criadas |
| `npm run typecheck` | ✅ **0 erros** |
| `npm run lint` | ❌ **8 erros** (regras de componentes em render / React Compiler) — §3 |
| `npm run build` (sem `DATABASE_URL`) | ❌ falha na coleta de páginas — §4 |
| `npm run build` (com `DATABASE_URL`) | ✅ 10 rotas compiladas — §4 |
| Testes de unidade (regras de negócio) | ✅ **32/32** — §5 |
| Testes E2E (rotas + Server Actions) | ✅ **24/24** — §6 |
| Smoke do servidor de produção (`next start`) | ✅ `/api/health`, redirects e páginas respondendo — §6 |

**Veredito: o app está funcional.** Todos os fluxos principais (criar perfil, registrar comida/receita/item manual, água, treino, métricas com upsert e atualização automática de peso, navegação entre telas, reset de conta) funcionaram de ponta a ponta. Os problemas encontrados são de **qualidade/robustez de engenharia** (lint, exigência de env no build, configuração hardcoded), não de funcionalidade quebrada — detalhados em [PLANEJAMENTO.md](./PLANEJAMENTO.md).

## 2. Ambiente de teste

- Node 22.22.3 · npm 10.9.8 · Next.js 16.2.6 (Turbopack) · TypeScript 5.9.3 · ESLint 9.39.
- PostgreSQL 18.4 (`embedded-postgres` via npm, sem root no sandbox) em `127.0.0.1:5432`, banco `app_db`.
- Servidor de produção: `next start -H 0.0.0.0 -p 3000` com `DATABASE_URL` apontando para o banco de teste.

## 3. Typecheck e Lint

- **`tsc --noEmit`: limpo** (strict mode).
- **ESLint: 8 erros, 0 warnings** (mesmo código roda sem problema no runtime hoje — são regras novas de `react-hooks`/React Compiler do `eslint-config-next` 16):

| Arquivo | Regra | Onde |
|---|---|---|
| `src/app/(app)/tabela/FoodTable.tsx` | `react-hooks/static-components` — componente `H` criado dentro do render (7×, usos nas linhas 153–159 + definição na linha 49) | Cabeçalho ordenável da tabela |
| `src/app/(app)/hidratacao/WaterTracker.tsx:70` | "Cannot reassign variable after render completes" — `acc += ml` reatribuído dentro do `Array.from` do `useMemo` do cronograma | Cálculo do acumulado dos copos |

Risco: se o React Compiler for habilitado no futuro, esses padrões podem quebrar memoização/estado. Correção é simples (extrair `H` para fora do componente; usar `map` com acumulador funcional ou `reduce`).

## 4. Build de produção

- **Sem `DATABASE_URL`**: `next build` **falha** em "Collecting page data" com `Error: DATABASE_URL is required` (o módulo `src/db/index.ts` valida a env no import, antes mesmo de qualquer query — afeta a rota `/api/health`).
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
