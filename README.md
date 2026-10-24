# FitVida — acompanhamento fitness personalizado

App web (Next.js + PostgreSQL) de acompanhamento fitness em **português (pt-BR)**: alimentação, treinos, hidratação, métricas corporais e receitas low-carb — tudo **calculado a partir do perfil do usuário** (objetivo, biotipo, rotina, equipamentos, lesões, restrições alimentares e condições de saúde).

> 📂 O código da aplicação vive em [`projeto-sequei/`](./projeto-sequei/) (pasta com o projeto Next.js). A documentação completa está em [`docs/`](./docs/).

---

## O que o app faz

| Área | Recurso |
|---|---|
| **Onboarding** | Wizard de 6 etapas com metas em tempo real (TMB, IMC, kcal, macros, previsão de semanas até o peso-alvo) |
| **Conta** | Cadastro/login por e-mail+senha (scrypt), sessão de 30 dias, acesso multi-dispositivo e vínculo automático do perfil anônimo |
| **Início (dashboard)** | Anel de calorias + macros do dia, hidratação, peso/IMC, treinos da semana, evolução de peso, receita sugerida e recomendações personalizadas |
| **Alimentação** | Diário por refeição com base TACO/USDA (113 alimentos), registro por medida caseira, item manual ou receita, cardápio sugerido com troca de opções e "feche seu dia" |
| **Treinos** | Plano semanal gerado por objetivo/nível/local/equipamentos/lesões (55 exercícios + cardio com MET), registro de sessões e histórico |
| **Hidratação** | Meta diária dinâmica, garrafa visual, cronograma de copos no horário, sequência (streak) |
| **Métricas** | Peso, % gordura (fórmula da Marinha dos EUA), medidas, FC de repouso e sono — com gráficos e atualização automática das metas |
| **Receitas** | 21 receitas low-carb com nutrição calculada ingrediente a ingrediente e compatibilidade com o seu perfil |
| **Tabela nutricional** | Tabela comparativa com busca, ordenação, simulação de porção e comparação de até 3 alimentos |
| **Perfil** | Edição completa (tudo recalculado na hora), conta e backup (export JSON/CSV, restaurar backup) e exclusão de dados |

## Stack

- **Next.js 16** (App Router, Turbopack) · **React 19** · **TypeScript 5.9** (strict)
- **Tailwind CSS 4** · **lucide-react** (ícones)
- **PostgreSQL** + **Drizzle ORM** (`pg`) · `drizzle-kit push` para o schema
- Server Components + Server Actions (`src/app/actions.ts`) · sessão anônima por cookie `fituid`

## Como rodar

```bash
cd projeto-sequei
npm install

# 1. Suba um PostgreSQL e crie o banco (DATABASE_URL apontando para ele)
# 2. Configure o ambiente:
cp .env.example .env        # edite DATABASE_URL

# 3. Crie as tabelas (migrações versionadas em drizzle/):
npm run db:migrate          # ou: npm run db:push (sem histórico)

# 4. (Opcional) Seed de demonstração: demo@fitvida.app / demo1234
npm run db:seed

# 5. Rode:
npm run dev                 # http://localhost:3000
```

**Atenção:** o build não exige mais banco — a conexão é criada sob demanda na primeira query em runtime. Veja [docs/TESTES.md](./docs/TESTES.md).

### Scripts disponíveis

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build de produção / servidor de produção |
| `npm run lint` | ESLint (flat config, `eslint-config-next/core-web-vitals`) |
| `npm run typecheck` | TypeScript sem emitir (`tsc --noEmit`) |
| `npm test` | Testes unitários (Vitest) |
| `npm run test:e2e` | Testes E2E (requer servidor + banco em execução) |
| `npm run db:migrate` / `db:push` | Migrações versionadas / push direto do schema |
| `npm run db:generate` | Gera nova migração a partir de mudanças no schema |
| `npm run db:seed` | Conta/perfil demo com registros de exemplo |

O CI (GitHub Actions, `.github/workflows/ci.yml`) roda typecheck, lint, build, testes unitários, migrações, seed e E2E a cada push/PR.

### Estrutura do repositório

```
.github/workflows/ci.yml   # CI: typecheck, lint, build, testes, migrações, E2E
projeto-sequei/
├── src/
│   ├── middleware.ts         # Headers de segurança (todas as respostas)
│   ├── app/
│   │   ├── actions.ts        # Server Actions (auth, perfil, registros, backup)
│   │   ├── onboarding/       # Wizard de criação de perfil
│   │   ├── login/ · cadastro/ # Conta (e-mail + senha)
│   │   ├── (app)/            # Área logada (layout com sidebar/barra inferior)
│   │   │   ├── page.tsx      # Dashboard
│   │   │   ├── alimentacao/  # Diário + modal de registro + cardápio
│   │   │   ├── exercicios/   # Plano de treino + registro
│   │   │   ├── hidratacao/   # Água
│   │   │   ├── metricas/     # Peso, medidas e gráficos
│   │   │   ├── receitas/     # Navegador de receitas
│   │   │   ├── tabela/       # Tabela nutricional
│   │   │   └── perfil/       # Conta/backup + edição de perfil + reset
│   │   └── api/
│   │       ├── health/       # Health check (ping no banco)
│   │       └── export/       # Backup JSON/CSV
│   ├── components/           # AppShell, ProfileWizard, AuthForm, UI
│   ├── lib/                  # calc, foods, mealplan, exercises, recipes,
│   │                         # data, session (conta+anônimo), password, ratelimit
│   └── db/                   # schema.ts (Drizzle) e index.ts (pool lazy)
├── drizzle/                  # Migrações SQL versionadas
├── scripts/seed.ts           # Seed de demonstração
├── tests/                    # unit/ (Vitest) e e2e/ (server actions via HTTP)
├── drizzle.config.ts         # lê DATABASE_URL do ambiente/.env
└── package.json
```

## Documentação

| Documento | Conteúdo |
|---|---|
| [docs/FUNCIONALIDADES.md](./docs/FUNCIONALIDADES.md) | Tour completo por tela e regras de cada recurso |
| [docs/ARQUITETURA.md](./docs/ARQUITETURA.md) | Arquitetura, modelo de dados e fórmulas de cálculo |
| [docs/TESTES.md](./docs/TESTES.md) | Sessão de validação e testes executada (resultados reais) |
| [docs/PLANEJAMENTO.md](./docs/PLANEJAMENTO.md) | Análise de lacunas e roadmap para o app evoluir |

## Avisos importantes

- **Não é conselho médico.** Metas e adaptações para condições de saúde (gestação, diabetes, renal etc.) são estimativas e sempre pedem acompanhamento profissional.
- **Conta opcional:** o app funciona sem login (cookie `fituid` anônimo). Crie uma conta para acessar seus dados em qualquer dispositivo — ao cadastrar, os dados já registrados no navegador são vinculados automaticamente. Sem conta, limpar cookies/perder o navegador significa perder o acesso aos dados.
- **Fontes nutricionais:** TACO 4ª edição (NEPA/UNICAMP) como base, com itens de USDA FoodData Central/rótulos e médias de mercado marcados por `src`.
