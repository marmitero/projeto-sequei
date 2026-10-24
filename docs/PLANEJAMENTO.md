# Análise e planejamento — o que falta para o FitVida ser MELHOR

Documento de produto/engenharia baseado no que **existe hoje** (ver [FUNCIONALIDADES.md](./FUNCIONALIDADES.md)) e nos achados da [sessão de testes](./TESTES.md). Nada foi implementado além da documentação e do `.gitignore`/`.env.example` — este é o plano para decisão.

---

## 1. O que já está bom (manter)

- **Motor de personalização forte**: metas, cardápio, treino e água reagem de verdade ao perfil (objetivo, lesões, gestação, diabetes, dieta, equipamentos). Poucos apps gratuitos têm esse nível de condicionamento.
- **Base nutricional honesta** (TACO/USDA, 113 alimentos com porções caseiras, IG, sódio, alergênios) e receitas com nutrição calculada ingrediente a ingrediente.
- **Arquitetura simples e correta**: Server Components + Server Actions, estado derivado (nada de "meta" engessada em banco), validação com clamps no servidor, upsert de métricas com atualização automática de peso → metas.
- **UI responsiva e em pt-BR**, com mobile-first (barra inferior + "Mais"), boas práticas de feedback (useTransition, confirmações).
- **Código pequeno e legível** (~5,5 mil linhas), strict TypeScript limpo.

## 2. Achados desta sessão (corrigir primeiro — P0)

> **2026-10-24: os itens 1–5 e 7–8 abaixo foram corrigidos e revalidados na Fase 0** (item 6 — migrações versionadas — seguiu para a Fase 1; testes/CI também). Detalhes em [TESTES.md §10](./TESTES.md).

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
1. **Sem login/conta** — cookie anônimo: trocar de celular/perder cookies = perder tudo; sem sync; sem recuperação. *É a lacuna mais grave para retenção.*
2. **Sem export/backup de dados** (CSV/JSON) — o histórico é refém do app.
3. **Sem lembretes/notificações** — `wakeTime`/`sleepTime` já são coletados, mas não geram nenhum alerta de água/refeição/treino.
4. **Sem estados de erro/carga** e sem feedback quando a ação falha (o wizard mostra 1 mensagem genérica).

### P2 — Profundidade do diário
5. **Alimentos personalizados não são reutilizáveis** (item manual some depois de registrado) — falta biblioteca "meus alimentos" + favoritos.
6. **Sem código de barras/consulta externa** (Open Food Facts/USDA) — 113 alimentos é pouco para uso diário a longo prazo.
7. **Sem lista de compras** automática a partir do cardápio da semana.
8. **Sem progressão de carga**: o treino registra `load` mas não há histórico por exercício, gráfico de evolução, sugestão de progressão (sobrecarga progressiva) nem export do treino do dia.
9. **Sem relatório semanal** (resumo de aderência, variação de peso, tendência) — os dados de "aderência" já existem em Métricas, mas não fecham um ciclo semanal.

### P3 — Engajamento e produto
10. **Sem PWA/offline** (o app é naturalmente mobile; registrar comida sem sinal é desejo óbvio).
11. **Sem gamificação**: streak de água existe; falta streak de registro, marcos, conquistas.
12. **Sem integrações** (Google Fit / Apple Health / relógios) — peso, passos e treinos entram manualmente.
13. **Sem fotos de progresso** e comparação corporal (medidas já são coletadas).
14. **Sem modo escuro** e sem acessibilidade auditada (foco em modais, ARIA).
15. **i18n fixa pt-BR** (hoje é decisão consciente; limita alcance).
16. **Sem multiusuário/admin** (nutricionista acompanhando alunos, plano familiar).

### Lacunas técnicas complementares
17. Testes automatizados **dentro do repo** (hoje os 56 testes desta sessão vivem fora) + CI (GitHub Actions: typecheck, lint, testes, build).
18. Rate limiting / headers de segurança / logs de auditoria (mesmo com app pessoal, `resetAccount` é destrutivo).
19. Observabilidade (métricas de erro, performance de queries) além do `/api/health`.
20. Paginação/limite em listas longas (métricas, histórico de treinos) e índices revisados conforme dados crescem.

## 4. Roadmap proposto

### Fase 0 — Higiene (1–2 dias) ✅ **concluída em 2026-10-24**
Corrigir os 8 erros de lint; env-driven config + build sem banco; renomear package; `error.tsx`/`loading.tsx`; validação de enums. **Critério:** `lint`/`typecheck`/`build` verdes em CI.
> **Status:** tudo implementado e revalidado (lint 0, typecheck 0, build sem env ✅, E2E 28/28 — ver [TESTES.md §10](./TESTES.md)). Pendente apenas de CI (movido para a Fase 1).

### Fase 1 — Fundação para crescer (1–2 semanas)
- **Conta real** (Auth.js/Lucia com e-mail+senha ou magic link) migrando o cookie anônimo → usuário; sync entre dispositivos.
- **Migrações Drizzle versionadas** + script de seed; **Vitest** com os testes desta sessão + **Playwright** para os fluxos E2E; **GitHub Actions**.
- Export/import JSON+CSV; rate limiting básico; `helmet`-like headers.
- **Critério:** usuário novo cria conta, registra tudo e exporta seus dados; CI verde na main.

### Fase 2 — Profundidade (2–4 semanas)
- Biblioteca "meus alimentos" + favoritos + repetir refeição de ontem; **código de barras** (Open Food Facts).
- **Lista de compras** semanal gerada do cardápio, com check.
- **Progressão de força**: histórico por exercício, gráfico de carga, sugestão de progressão, espelhar "comi isso"/"fiz isso" em 1 toque.
- **Relatório semanal** (aderência, peso, treinos) por push/e-mail + dashboard de tendências.
- **Critério:** 7 dias consecutivos de uso sem precisar de item manual; ≥30% dos registros via favoritos/repetição.

### Fase 3 — Engajamento (1–2 meses)
- **PWA** + notificações (água no cronograma que já existe, treino do dia, pesagem) usando `wakeTime`/`sleepTime`.
- Gamificação (streaks, marcos), fotos de progresso + comparação, modo escuro.
- Integração Google Fit/Apple Health (peso, sono, treinos).
- **Critério:** retenção D30; streak médio ≥ 5 dias.

### Fase 4 — Escala (contínuo)
- Planos compartilhados (nutricionista ↔ aluno), família; i18n; receitas da comunidade; ajuste de metas por IA com base na aderência real; apps nativos se houver tração.

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

**Ordem recomendada:** Fase 0 → Fase 1 (conta + testes/CI) → Fase 2 (diário/progressão) → Fase 3. As fases 0–1 desbloqueiam todo o resto com baixo risco.
