# Análise e planejamento — o que falta para o FitVida ser MELHOR

Documento de produto/engenharia baseado no que **existe hoje** (ver [FUNCIONALIDADES.md](./FUNCIONALIDADES.md)) e nos achados da [sessão de testes](./TESTES.md). Este documento foi gerado antes das implementações; os itens resolvidos estão marcados ✅ nas seções abaixo (Fases 0–2 concluídas em 2026-10-24).

---

## 1. O que já está bom (manter)

- **Motor de personalização forte**: metas, cardápio, treino e água reagem de verdade ao perfil (objetivo, lesões, gestação, diabetes, dieta, equipamentos). Poucos apps gratuitos têm esse nível de condicionamento.
- **Base nutricional honesta** (TACO/USDA, 113 alimentos com porções caseiras, IG, sódio, alergênios) e receitas com nutrição calculada ingrediente a ingrediente.
- **Arquitetura simples e correta**: Server Components + Server Actions, estado derivado (nada de "meta" engessada em banco), validação com clamps no servidor, upsert de métricas com atualização automática de peso → metas.
- **UI responsiva e em pt-BR**, com mobile-first (barra inferior + "Mais"), boas práticas de feedback (useTransition, confirmações).
- **Código pequeno e legível** (~5,5 mil linhas), strict TypeScript limpo.

## 2. Achados desta sessão (corrigir primeiro — P0)

> **2026-10-24: todos os itens abaixo (1–8) foram corrigidos** — 1–5 e 7–8 na Fase 0; item 6 (migrações versionadas) e a pendência de testes/CI na Fase 1. Detalhes em [TESTES.md §10 e §11](./TESTES.md).

| # | Achado | Impacto | Correção proposta |
|---|---|---|---|
| 1 | `npm run lint` com **8 erros** (componente `H` criado em render em `FoodTable.tsx`; `acc +=` em `useMemo` em `WaterTracker.tsx`) | CI quebrado; risco com React Compiler | Extrair componente; trocar acumulador por `reduce`/variável local do `map` |
| 2 | `npm run build` **exige `DATABASE_URL`** (throw no import de `src/db/index.ts`) | Build em CI/CD sem banco falha | Tornar o pool lazy ou validar em runtime; documentar env obrigatória (feito no README) |
| 3 | `drizzle.config.json` com **credenciais hardcoded** | Vazamento de padrão; inflexível entre ambientes | Ler `process.env.DATABASE_URL` |
| 4 | `package.json` ainda se chama `nextjs-postgresql-template` | Confusão; tooling errado | Renomear para `fitvida`/`projeto-sequei` + description |
| 5 | Sem `.gitignore`, `.env.example`, README, testes no repo e CI | Risco (commit de `node_modules`/`.env`), onboarding ruim | `.gitignore`/`.env.example`/README **já entregues**; faltam testes+CI |
| 6 | Só `drizzle-kit push` (sem migrações versionadas) | Alterações de schema irreversíveis em produção | Adotar `drizzle-kit generate` + `migrate` |
| 7 | Sem `error.tsx`, `loading.tsx` nem 404 próprio | Erro de banco = tela branca; sem skeletons | Criar estados de erro/carga por rota |
| 8 | `saveProfile` não valida enums (goal, diet, pace…) — texto livre no banco | Dados inválidos silenciosos | Whitelist por campo (zod ou enum manual) |

## 3. Lacunas de produto (por que o usuário larga o app)

### P1 — Confiança e continuidade
1. ~~Sem login/conta~~ ✅ **resolvido na Fase 1**: conta com e-mail+senha, sessão de 30 dias, sync entre dispositivos e vínculo automático do perfil anônimo. (Restam para evoluir: recuperação de senha por e-mail e 2FA.)
2. ~~Sem export/backup de dados~~ ✅ **resolvido na Fase 1**: export JSON completo + CSVs por área + restauração de backup.
3. **Sem lembretes/notificações** — `wakeTime`/`sleepTime` já são coletados, mas não geram nenhum alerta de água/refeição/treino.
4. ~~Sem estados de erro/carga~~ ✅ **resolvido na Fase 0/1**: `error.tsx`/`loading.tsx`/404 e mensagens de erro por ação.

### P2 — Profundidade do diário
5. ~~Alimentos personalizados não são reutilizáveis~~ ✅ **resolvido na Fase 2**: biblioteca "meus alimentos" (`custom_foods`), favoritos (alimentos/receitas/pessoais) e "repetir refeição de ontem".
6. ~~Sem código de barras/consulta externa~~ ✅ **resolvido na Fase 2**: consulta ao Open Food Facts por código de barras (6–14 dígitos) com degradação graciosa offline; base TACO segue como principal.
7. ~~Sem lista de compras~~ ✅ **resolvido na Fase 2**: `/compras` gera a lista dos próximos 7 dias do cardápio, por categoria, com checklist persistente.
8. ~~Sem progressão de carga~~ ✅ **resolvido na Fase 2**: histórico por exercício, gráfico de carga, sugestão heurística (+5%/manter/deload) e "Fiz isso" em 1 toque. (Export do treino do dia segue disponível via export JSON/CSV.)
9. ~~Sem relatório semanal~~ ✅ **resolvido na Fase 2**: relatório da semana corrente vs. anterior + tendências de 4 semanas em Métricas. (Envio por push/e-mail fica para a Fase 3.)

### P3 — Engajamento e produto
10. **Sem PWA/offline** (o app é naturalmente mobile; registrar comida sem sinal é desejo óbvio).
11. **Sem gamificação**: streak de água existe; falta streak de registro, marcos, conquistas.
12. **Sem integrações** (Google Fit / Apple Health / relógios) — peso, passos e treinos entram manualmente.
13. **Sem fotos de progresso** e comparação corporal (medidas já são coletadas).
14. **Sem modo escuro** e sem acessibilidade auditada (foco em modais, ARIA).
15. **i18n fixa pt-BR** (hoje é decisão consciente; limita alcance).
16. **Sem multiusuário/admin** (nutricionista acompanhando alunos, plano familiar).

### Lacunas técnicas complementares
17. ~~Testes automatizados dentro do repo + CI~~ ✅ **resolvido na Fase 1**: Vitest (`tests/unit` + `tests/e2e`) e GitHub Actions rodando a bateria completa. (Playwright em navegador pode ser adicionado depois.)
18. Rate limiting / headers de segurança / logs de auditoria (mesmo com app pessoal, `resetAccount` é destrutivo).
19. Observabilidade (métricas de erro, performance de queries) além do `/api/health`.
20. Paginação/limite em listas longas (métricas, histórico de treinos) e índices revisados conforme dados crescem.

## 4. Roadmap proposto

### Fase 0 — Higiene (1–2 dias) ✅ **concluída em 2026-10-24**
Corrigir os 8 erros de lint; env-driven config + build sem banco; renomear package; `error.tsx`/`loading.tsx`; validação de enums. **Critério:** `lint`/`typecheck`/`build` verdes em CI.
> **Status:** tudo implementado e revalidado (lint 0, typecheck 0, build sem env ✅, E2E 28/28 — ver [TESTES.md §10](./TESTES.md)). Pendente apenas de CI (movido para a Fase 1).

### Fase 1 — Fundação para crescer (1–2 semanas) ✅ **concluída em 2026-10-24**
- **Conta real** (Auth.js/Lucia com e-mail+senha ou magic link) migrando o cookie anônimo → usuário; sync entre dispositivos.
- **Migrações Drizzle versionadas** + script de seed; **Vitest** com os testes desta sessão + **Playwright** para os fluxos E2E; **GitHub Actions**.
- Export/import JSON+CSV; rate limiting básico; `helmet`-like headers.
- **Critério:** usuário novo cria conta, registra tudo e exporta seus dados; CI verde na main.
> **Status:** implementado com auth própria (scrypt + sessões revogáveis + claim do perfil anônimo, sem dependências novas de auth), migrações em `drizzle/`, seed demo, Vitest (39 unit) + E2E via Server Actions (31) — **Playwright adiado** (testes E2E cobrem os fluxos sem navegador; pode ser adicionado em CI depois), CI completo em `.github/workflows/ci.yml`, export JSON/CSV + import JSON, rate limiting e headers. Ver [TESTES.md §11](./TESTES.md).

### Fase 2 — Profundidade (2–4 semanas) ✅ **concluída em 2026-10-24**
- Biblioteca "meus alimentos" + favoritos + repetir refeição de ontem; **código de barras** (Open Food Facts).
- **Lista de compras** semanal gerada do cardápio, com check.
- **Progressão de força**: histórico por exercício, gráfico de carga, sugestão de progressão, "fiz isso" em 1 toque.
- **Relatório semanal** (aderência, peso, treinos) + dashboard de tendências (envio por push/e-mail fica para a Fase 3).
- **Critério:** 7 dias consecutivos de uso sem precisar de item manual; ≥30% dos registros via favoritos/repetição.
> **Status:** tudo implementado — `custom_foods`/`favorites` (migração 0001), abas Meus/Favoritos/Código no modal de alimentos, "Repetir de ontem" por refeição, `/compras` com checklist persistente, seção de progressão em Treinos (gráfico + sugestão + "Fiz isso"), relatório semanal + tendências em Métricas. Barcode testado no caminho de degradação (sandbox sem acesso à API externa; a integração real usa o mesmo mapper). 90/90 testes (48 unit + 42 e2e) — ver [TESTES.md §12](./TESTES.md). Pendências da Fase 2: instrumentação do critério ≥30% (derivável do banco) e envio do relatório por push/e-mail (movido para Fase 3 junto de notificações).

### Fase 3 — Engajamento (1–2 meses) ✅ **concluída em 2026-10-25**
- **PWA** + notificações (água no cronograma que já existe, treino do dia, pesagem) usando `wakeTime`/`sleepTime`.
- Gamificação (streaks, marcos), fotos de progresso + comparação, modo escuro.
- Integração Google Fit/Apple Health (peso, sono, treinos).
- **Critério:** retenção D30; streak médio ≥ 5 dias.

> **Status:** tudo implementado — PWA (`manifest.webmanifest` + `sw.js` + ícone; cache de assets imutáveis e fallback offline de páginas), lembretes pelo navegador (Notification API agendada pela agenda `src/lib/reminders.ts` derivada de `wakeTime`/`sleepTime`: água distribuída no dia, treino no período preferido, pesagem semanal; toggles no shell), gamificação (streaks diário/água/treino + 16 marcos derivados dos registros, painel no dashboard), fotos de progresso (tabela `progress_photos` — migração `0002` — upload/lista/exclusão via `/api/photos`, galeria com comparação de 2 fotos em `/metricas`), import de saúde offline (Apple Health `export.xml` e CSV de peso do Google Fit/planilhas via `/api/health-import`; peso, % gordura e sono entram nas métricas por data) e modo escuro completo (script anti-FOUC + toggle persistido em `fitvida-theme`, com fallback para o esquema do sistema). 106/106 testes (55 unit + 51 e2e) — ver [TESTES.md §14](./TESTES.md).
>
> **Limitações honestas (futuro):** notificações só funcionam com o app aberto (Web Push/VAPID com service worker exige servidor de push — fora do escopo); integração Google Fit/Apple Health é por arquivo (OAuth das APIs exige credenciais/configuração do usuário); o critério retenção D30 e o streak médio ≥ 5 dias são métricas de produto — deriváveis dos dados (`daily streaks` em `src/lib/gamification.ts`), mas não mensuráveis no ambiente de teste. Envio do relatório semanal por push/e-mail permanece pendente (mencionado na Fase 2).

### Fase 4 — Escala (contínuo) 🟡 **primeira leva concluída em 2026-10-25**
- Planos compartilhados (nutricionista ↔ aluno), família; i18n; receitas da comunidade; ajuste de metas por IA com base na aderência real; apps nativos se houver tração.

> **Status (leva implementada):**
> - **Planos compartilhados** ✅ — links somente-leitura (`plan_shares`, migração `0003`): criação/cópia/revogação em `/perfil`; página pública `/compartilhar/[token]` com resumo, metas, plano semanal, últimos 7 dias e evolução de peso. Cobre nutricionista ↔ aluno **e** acompanhamento familiar pelo mesmo mecanismo.
> - **Receitas da comunidade** ✅ — `/comunidade`: publicar (validação pura em `src/lib/community.ts`), galeria com macros/tags/autor, curtidas (1/usuário/receita), excluir a própria (a alheia não pode ser excluída — testado). Tabelas `community_recipes` + `community_recipe_likes`.
> - **Ajuste de metas com base na aderência real** ✅ — motor **determinístico de regras** (`src/lib/goalcoach.ts`, sem LLM externo — nome honesto: "Ajuste inteligente de metas"): compara tendência de peso (≥4 pesagens em ≥14 dias) com a projeção do ritmo, aderência de registro (28 dias), hidratação média e treinos planejados × realizados; recomenda e aplica ajustes finos (±100 kcal; água realista em passos de 250 ml) com pisos/tetos seguros (`clampTargets`: 1200/1500 kcal, 1500–6000 ml). Overrides em `users.target_overrides` aplicados em `getContext` ("Restaurar metas automáticas" volta ao cálculo). UI em `/metricas`.
> - 121/121 testes (63 unit + 58 e2e) — ver [TESTES.md §15](./TESTES.md).
>
> **Fora desta leva (futuro, com justificativa):** **i18n** (exige decisão de idiomas-alvo e extração completa das ~500 strings PT-BR — refactor transversal que merece rodada própria); **grupos de família com contas vinculadas** (além do compartilhamento por link, exige convites/permissões — design de produto); **apps nativos** (exigem contas de loja/tração — como previsto no plano); **IA com modelo externo** (LLM requer credenciais/APIs de terceiras fora do sandbox; o motor atual é auditável e offline); envio de relatório por push/e-mail segue pendente desde a Fase 2/3 (Web Push).

## 5. Riscos e decisões

| Risco | Mitigação |
|---|---|
| Autenticação quebra usuários anônimos atuais | Migração "claim my data" (cookie → conta no 1º login) |
| Base TACO limita retenção (alimento não encontrado = churn) | Fase 2: favoritos + barcode + API externa |
| Escopo "app fitness" é enorme (MyFitnessPal + Strava) | Focar no diferencial: **personalização por saúde/rotina**; integrações em vez de reinventar |
| Dados de saúde são sensíveis (LGPD) | Política de privacidade, export/delete total, criptografia em trânsito/armazenamento, minimalismo de dados |
| Sugestões nutricionais/ médicas geram responsabilidade | Manter avisos "não é conselho médico" (já existem) e validação com profissionais antes de novos ajustes para condições |

## 6. Métricas de sucesso sugeridas
- **Ativação:** % de onboarding concluído + 1 registro no dia 1.
- **Hábito:** ≥3 dias com registro de comida na 1ª semana; streak de água.
- **Resultado percebido:** % de usuários que registram peso ≥ 2×/semana após 30 dias.
- **Qualidade:** erros de ação < 1%, build/lint verdes, p95 de render < 500 ms.

---

**Ordem recomendada:** Fase 0 ✅ → Fase 1 ✅ → Fase 2 ✅ → Fase 3 (engajamento). As fases 0–1 desbloqueiam todo o resto com baixo risco.
