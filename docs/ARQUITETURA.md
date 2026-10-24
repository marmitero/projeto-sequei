# Arquitetura e modelo de dados

Documento técnico do app atual (`projeto-sequei/`), derivado do código-fonte. Fórmulas e constantes listadas como implementadas em `src/lib/calc.ts`, `src/lib/mealplan.ts` e `src/lib/exercises.ts`.

---

## 1. Visão geral

```
Navegador (React 19, client components)
   │  fetch / navegação / Server Actions (POST)
   ▼
Next.js 16 — App Router (Server Components)
   │  src/app/actions.ts  ── write (valida, clamp, upsert)
   │  src/lib/data.ts     ── read (queries prontas)
   │  src/lib/session.ts  ── cookie fituid → usuário
   ▼
Drizzle ORM (node-postgres, Pool global em dev)
   ▼
PostgreSQL (users, food_logs, water_logs, workout_logs, metrics)
```

- **Estado derivado > estado armazenado**: metas calóricas, cardápio, plano de treino e meta de água **não são persistidos** — são recalculados a cada render a partir do perfil (e, para cardápio/treino, de um RNG determinístico). Persistem apenas perfil e registros (comida, água, treino, métricas).
- **Server Components** fazem todo o acesso a dados (páginas `async`); componentes `"use client"` (diário, modal, planner, etc.) interagem via **Server Actions** com `useTransition` + `revalidatePath("/", "layout")`.
- **Sem framework de UI**: Tailwind 4 + classes utilitárias próprias (`.card`, `.btn-primary`, `.chip-on`…) em `globals.css` + componentes em `src/components/ui.tsx` (Ring, Bar, MacroRow, MacroPills, LineChart SVG, Stat, PageHeader).

## 2. Estrutura de pastas

```
src/
├── app/
│   ├── layout.tsx            # Root layout (pt-BR, metadata, viewport)
│   ├── globals.css           # Tailwind 4 + utilitários
│   ├── actions.ts            # Todas as Server Actions
│   ├── onboarding/page.tsx
│   ├── (app)/                # Grupo com layout protegido
│   │   ├── layout.tsx        # getUser() → redirect /onboarding + AppShell
│   │   └── <área>/page.tsx   # Server Component + island client
│   └── api/health/route.ts
├── components/               # AppShell (nav), ProfileWizard, ui.tsx
├── lib/
│   ├── calc.ts               # Perfil, metas, fórmulas, datas, RNG, dicas
│   ├── foods.ts              # 113 alimentos TACO/USDA + filtros
│   ├── mealplan.ts           # Gerador de cardápio
│   ├── exercises.ts          # 55 exercícios + METs + gerador de treino
│   ├── recipes.ts            # 21 receitas + nutrição/compatibilidade
│   ├── data.ts               # Queries de leitura + getContext()
│   └── session.ts            # getUserId/getUser/toProfile
└── db/
    ├── schema.ts             # Tabelas Drizzle + tipos
    └── index.ts              # Pool pg (globalThis em dev) + drizzle
```

## 3. Modelo de dados (PostgreSQL)

`drizzle/` guarda as **migrações SQL versionadas** (`npm run db:migrate`); `npx drizzle-kit push` continua funcionando para dev rápido. `npm run db:generate` cria nova migração ao mudar o schema.

### `accounts` — conta de acesso (opcional)
UUID PK, `email` (único, minúsculo), `password_hash` (scrypt com salt), `created_at`, `updated_at`.

### `sessions` — sessões ativas
`token_hash` (SHA-256 do token do cookie) PK, `account_id` (FK → accounts, **cascade**), `expires_at` (30 dias), `created_at`. Permite revogação (logout).

### `users` — perfil (1 linha por usuário)
UUID PK (`defaultRandom`), `account_id` (FK → accounts, **set null**, **índice único** — 1 perfil por conta). Colunas: `name`, `sex` (M|F), `birth_date`, `height_cm`, `weight_kg`, `target_weight_kg`, `goal` (perder|manter|ganhar|recomp), `pace` (leve|moderado|agressivo), `activity_level`, `experience`, `training_days`, `session_minutes`, `location`, `equipment[]`, `cardio_prefs[]`, `injuries[]`, `diet`, `carb_approach`, `restrictions[]`, `dislikes`, `health_conditions[]`, `meals_per_day`, `wake_time`, `sleep_time`, `training_time`, `climate`, `timezone`, `created_at`, `updated_at`.

### `food_logs` — itens do diário
`serial` PK, `user_id` (FK → users, **cascade**), `date`, `meal` (cafe|lanche_manha|almoco|lanche_tarde|jantar|ceia), `food_key?`, `recipe_key?`, `name`, `grams`, `portion_label`, `kcal`, `protein`, `carbs`, `fat`, `fiber`, `created_at`. Índice `(user_id, date)`. Nutrientes são **cópia congelada** no momento do registro (a base pode evoluir sem corromper o histórico).

### `water_logs`
`id`, `user_id` (FK cascade), `date`, `ml` (10–3000), `created_at`. Índice `(user_id, date)`.

### `workout_logs`
`id`, `user_id` (FK cascade), `date`, `title`, `kind` (forca|cardio|mobilidade|esporte), `duration_min`, `kcal`, `effort` (1–10, default 6), `exercises jsonb` (`WorkoutExercise[] = {name, sets, reps, load?, done?}`, até 20), `notes`, `created_at`. Índice `(user_id, date)`.

### `metrics` — medidas corporais
`id`, `user_id` (FK cascade), `date`, `weight_kg?`, `body_fat_pct?`, `waist_cm?`, `hip_cm?`, `neck_cm?`, `chest_cm?`, `arm_cm?`, `thigh_cm?`, `resting_hr?`, `sleep_hours?`, `notes`, `created_at`. **Índice único `(user_id, date)`** → upsert diário.

## 4. Sessão e identidade

- **Modo anônimo**: cookie `fituid` = UUID do perfil (`httpOnly`, `sameSite=lax`, 2 anos).
- **Modo conta**: cookie `fit_session` = token aleatório (30 dias); apenas o SHA-256 é persistido em `sessions`. Logout revoga o token.
- **Resolução de usuário** (`getUser()`): 1) sessão → `accounts` → `users.account_id`; 2) fallback cookie `fituid`; 3) `null`. Assim o login em outro dispositivo recupera o mesmo perfil sem cookie local.
- **Claim do anônimo**: ao registrar/entrar sem perfil na conta, o perfil do cookie `fituid` (se não vinculado) é reivindicado (`users.account_id`).
- `getContext()` (usado por todas as páginas): usuário + `toProfile()` + `computeTargets()` + `todayIn(timezone)` — sem usuário → `redirect("/onboarding")`.
- `requireUser()` (todas as writes) resolve via `getUser()` — funciona em ambos os modos.
- **Senhas**: scrypt (N=16384, r=8, p=1, 64 bytes) com salt por usuário e comparação em tempo constante (`src/lib/password.ts`).
- **Rate limiting** (`src/lib/ratelimit.ts`, janela deslizante em memória): registro 3/10 min por e-mail + 30/10 min por IP; login 10/5 min por e-mail + 60/5 min por IP; importação 10/min.

## 5. Regras de cálculo (`src/lib/calc.ts`)

### Metas diárias (`computeTargets`)
1. **TMB** (Mifflin-St Jeor): `10·kg + 6.25·cm − 5·idade + (M: +5 | F: −161)`.
2. **TDEE** = TMB × fator de atividade: sedentário 1,2 · leve 1,375 · moderado 1,55 · intenso 1,725 · atleta 1,9.
3. **Ajuste calórico** por objetivo e ritmo (`leve 0,10 | moderado 0,18 | agressivo 0,25`):
   - perder: `−TDEE·ritmo`; ganhar: `+TDEE·(ritmo·0,6)`; recomp: `−TDEE·0,08`; manter: 0.
   - gestante: `max(delta,0) + 300` · lactante: `+450` (nunca déficit).
   - Piso seguro: **1500 kcal (M) / 1200 kcal (F)** com aviso quando aplicado.
4. **Proteína** (g/kg): perder 2,0 · manter 1,6 · ganhar 1,8 · recomp 2,1;
   - −0,2 se iniciante com ≤2 treinos/semana; mín 1,3 g/kg aos 60+;
   - **renal: 0,8 g/kg** (com aviso de acompanhamento médico);
   - peso de referência para IMC > 30: `peso_ideal(IMC 24,9) + 25% do excesso` (peso ajustado).
5. **Gordura/carboidrato**:
   - equilibrada: gordura `≥ max(27% kcal/9, 0,7 g/kg)` e carbo = resto; diabetes: carbo `≤ 40% kcal`;
   - low-carb: carbo `min(20% kcal/4, 130 g)`, gordura = resto;
   - cetogênica: carbo ≈ 30 g, gordura = resto; piso de carbo 20 g.
6. **Fibras**: 14 g a cada 1000 kcal. **Água**: 35 ml/kg (30 ml/kg se > 55 anos) + 500 (clima quente) + 300 (atividade intensa/atleta) + 300 (gestante) + 700 (lactante), arredondado em 50 ml; **extra de treino** = 500 ml/h de sessão.
7. Saídas: `deltaKcal`, `weeklyChangeKg = deltaKcal·7/7700` (1 kg ≈ 7700 kcal), `weeksToGoal = ceil(|Δpeso|/|semanal|)`, `proteinPerKg` real e `notes[]` de segurança.

### Outras fórmulas
- **IMC** = kg/m²; classificação OMS (<18,5 · <25 · <30 · <35 · <40 · ≥40).
- **% gordura (Marinha dos EUA)**: homens `495/(1,0324 − 0,19077·log10(cintura−pescoço) + 0,15456·log10(altura)) − 450`; mulheres com `cintura+quadril−pescoço` e coeficientes equivalentes; exige as medidas.
- **kcal de atividade** = `MET × peso × horas` (ex.: MET 8, 70 kg, 30 min = 280 kcal).
- **Datas**: `todayIn(tz)` via `Intl` (en-CA); `addDays` em UTC; `weekdayOf` (0 = domingo).
- **RNG determinístico**: hash FNV-1a (`hashSeed`) + gerador mulberry32 (`rng`) → mesmo perfil + mesma seed = mesmo cardápio/treino.

## 6. Geração de cardápio (`src/lib/mealplan.ts`)

- Refeições conforme `mealsPerDay` (3–6) e **splits de caloria por refeição** (ex. 5 refeições: 20/10/30/15/25%).
- Templates por tipo de refeição (café, lanche, principal, ceia) com slots (proteína, carbo, leguminosa, vegetais, fruta, gordura, bebida) e piscas de candidatos.
- Filtros encadeados: dieta (origem), alergênios, aversões textuais, saúde (IG alto↔diabetes, sódio alto↔hipertensão, lista de exclusões para colesterol/gestação), abordagem de carbo (low-carb restringe frutas/carbos; cetogênica remove carbo e leguminosa), vegano adiciona proteínas vegetais.
- Gramatura do item de proteína/carbo/gordura é calculada para aproximar a meta da refeição, com teto por alimento e por kcal (60% das kcal da refeição na proteína) e arredondamento em medidas caseiras (`roundGrams`/`bestPortion`).
- Evita repetir o mesmo alimento no dia (`used`); seed = `userId|date` + overrides por refeição (botão "trocar").

## 7. Geração de treino (`src/lib/exercises.ts`)

- **Catálogo**: 55 exercícios com padrão de movimento (squat, hinge, lunge, push/pull H/V, glúteo, braços, core, panturrilha, lateral), equipamento, nível (1–3), `avoid[]` (articulações) e dica técnica.
- **Splits** por dias/semana (full body ≤3 · superiores/inferiores 4 · empurrar/puxar/pernas 5 · PPL×2 6–7) e **dias fixos** (ex.: 3 dias = seg/qua/sex).
- **Parâmetros por objetivo** (séries, reps, descanso, min de cardio): perder 3×12–15/45–60 s/20 min · manter 3×10–12 · ganhar 4×6–10/90–120 s · recomp 4×8–12.
- Nº de exercícios por sessão derivado de `sessionMinutes` (força ≈ sessão − aquecimento − cardio; 3–8 exercícios).
- **Filtros**: equipamento (academia = todos; casa = `none` + informados), nível (≤ experiência), lesões (`avoid`), gestação (lista extra de exclusão).
- **Cardio**: preferências do usuário, forçado de baixo impacto (caminhada/bike/elíptico/natação/remo) com lesão de joelho/tornozelo, IMC ≥ 30, idade ≥ 60 ou gestação; sem HIIT na gestação.
- **kcal estimadas** = força (MET 5–6 conforme objetivo) + cardio (MET da modalidade).

## 8. Segurança e validação (como está)

- Server Actions exigem `Origin` compatível (proteção CSRF nativa do Next) e `requireUser` (perfil via sessão ou cookie).
- Entradas sanitizadas: `num()` com clamp por campo, `isDate()`/`isTime()` por regex, strings truncadas, **whitelists de enums/arrays** (`profileValues`), lote ≤ 30 itens, `exercises` ≤ 20, métricas por faixa.
- Deletes sempre escopados por `user_id` (não há IDOR entre usuários).
- Cookies `httpOnly`/`sameSite`; senhas scrypt; sessões revogáveis; rate limiting em auth/import.
- `src/middleware.ts` define headers "helmet-like" em todas as respostas: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `X-DNS-Prefetch-Control` e `Strict-Transport-Security` em produção.
- Export exige usuário autenticado (401 sem sessão/perfil). Sem logs de auditoria (ver [PLANEJAMENTO.md](./PLANEJAMENTO.md)).

## 9. Infra e configuração

- `DATABASE_URL` obrigatória **em runtime** (validada na 1ª query via pool lazy em `src/db/index.ts`); `next build` roda sem banco.
- `drizzle.config.ts` lê `DATABASE_URL` do ambiente/`.env` (via `dotenv`) e falha com mensagem clara se ausente.
- Pool `pg` reutilizado via `globalThis` em dev; queries via Drizzle (`select/insert/update/delete/onConflictDoUpdate`).
- Migrações versionadas em `drizzle/` (`db:migrate`/`db:generate`); seed demo (`db:seed`); testes em `tests/` (Vitest — unit e E2E via protocolo de Server Actions).
- Todas as rotas do app são **dinâmicas** (cookies); `/_not-found` é estática; `/login` e `/cadastro` são dinâmicas.
- APIs: `GET /api/health` (ping no banco) e `GET /api/export?format=json|csv&type=profile|foods|water|workouts|metrics` (backup).
