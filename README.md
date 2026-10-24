# FitVida — acompanhamento fitness personalizado

App web (Next.js + PostgreSQL) de acompanhamento fitness em **português (pt-BR)**: alimentação, treinos, hidratação, métricas corporais e receitas low-carb — tudo **calculado a partir do perfil do usuário** (objetivo, biotipo, rotina, equipamentos, lesões, restrições alimentares e condições de saúde).

> 📂 O código da aplicação vive em [`projeto-sequei/`](./projeto-sequei/) (pasta com o projeto Next.js). A documentação completa está em [`docs/`](./docs/).

---

## O que o app faz

| Área | Recurso |
|---|---|
| **Onboarding** | Wizard de 6 etapas com metas em tempo real (TMB, IMC, kcal, macros, previsão de semanas até o peso-alvo) |
| **Início (dashboard)** | Anel de calorias + macros do dia, hidratação, peso/IMC, treinos da semana, evolução de peso, receita sugerida e recomendações personalizadas |
| **Alimentação** | Diário por refeição com base TACO/USDA (113 alimentos), registro por medida caseira, item manual ou receita, cardápio sugerido com troca de opções e "feche seu dia" |
| **Treinos** | Plano semanal gerado por objetivo/nível/local/equipamentos/lesões (55 exercícios + cardio com MET), registro de sessões e histórico |
| **Hidratação** | Meta diária dinâmica, garrafa visual, cronograma de copos no horário, sequência (streak) |
| **Métricas** | Peso, % gordura (fórmula da Marinha dos EUA), medidas, FC de repouso e sono — com gráficos e atualização automática das metas |
| **Receitas** | 21 receitas low-carb com nutrição calculada ingrediente a ingrediente e compatibilidade com o seu perfil |
| **Tabela nutricional** | Tabela comparativa com busca, ordenação, simulação de porção e comparação de até 3 alimentos |
| **Perfil** | Edição completa (tudo recalculado na hora) e exclusão da conta |

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

# 3. Crie as tabelas:
npx drizzle-kit push

# 4. Rode:
npm run dev                 # http://localhost:3000
```

**Atenção:** `npm run build` também exige `DATABASE_URL` definido (o módulo de banco valida a env na importação). Veja [docs/TESTES.md](./docs/TESTES.md).

### Scripts disponíveis

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build de produção / servidor de produção |
| `npm run lint` | ESLint (flat config, `eslint-config-next/core-web-vitals`) |
| `npm run typecheck` | TypeScript sem emitir (`tsc --noEmit`) |
| `npx drizzle-kit push` | Aplica o schema ao banco (sem arquivos de migração) |

### Estrutura do repositório

```
projeto-sequei/
├── src/
│   ├── app/
│   │   ├── actions.ts          # Server Actions (todo o write path)
│   │   ├── onboarding/         # Wizard de criação de perfil
│   │   ├── (app)/              # Área logada (layout com sidebar/barra inferior)
│   │   │   ├── page.tsx        # Dashboard
│   │   │   ├── alimentacao/    # Diário + modal de registro + cardápio
│   │   │   ├── exercicios/     # Plano de treino + registro
│   │   │   ├── hidratacao/     # Água
│   │   │   ├── metricas/       # Peso, medidas e gráficos
│   │   │   ├── receitas/       # Navegador de receitas
│   │   │   ├── tabela/         # Tabela nutricional
│   │   │   └── perfil/         # Edição de perfil + reset
│   │   └── api/health/route.ts # Health check (ping no banco)
│   ├── components/             # AppShell, ProfileWizard, UI (Ring, gráficos…)
│   ├── lib/                    # calc, foods, mealplan, exercises, recipes, data, session
│   └── db/                     # schema.ts (Drizzle) e index.ts (pool)
├── drizzle.config.json
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
- **Sessão anônima:** não há login. O cookie `fituid` identifica o usuário naquele navegador — limpar cookies/perder o acesso significa perder o acesso aos dados (não há recuperação).
- **Fontes nutricionais:** TACO 4ª edição (NEPA/UNICAMP) como base, com itens de USDA FoodData Central/rótulos e médias de mercado marcados por `src`.
