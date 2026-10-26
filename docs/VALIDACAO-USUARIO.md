# Validação estilo usuário — FitVida (2026-10-26)

Relatório de uma validação manual/automatizada da plataforma simulando o uso real de um
usuário (cadastro → wizard → rotina diária → todas as telas), com foco em **bugs de
interface/experiência**, **melhorias de sistema** e **melhorias de UX**. Escopo: app
`projeto-sequei` (Next.js 16 + PostgreSQL). Tudo programático, sem APIs externas.

## 1. Método

- Servidor de produção (`next start`) com banco real; walk-through via HTTP cobrindo
  cadastro (server action `saveProfile`), wizard, e as 13 rotas renderizadas (SSR):
  `/` (dashboard), `/alimentacao`, `/hidratacao`, `/exercicios`, `/metricas`, `/receitas`,
  `/compras`, `/tabela`, `/comunidade`, `/familia`, `/perfil`, `/onboarding`, `/login`
  (+ 404 de rota inexistente).
- Fluxos exercitados: cadastro completo, plano gerado, registrar alimento (catálogo +
  receita + custom), registrar água, registrar treino, salvar métrica, publicar receita
  na comunidade, criar grupo de família + convite + entrada por código, compartilhamento
  público de perfil (`/compartilhar/[token]`), export/import de saúde (UI), login/sair,
  troca de idioma (pt, en, fr, es, zh) e de tema (claro/escuro).
- Varredura automatizada por **vazamento de chaves de i18n** e **variáveis `{{ }}` cruas**
  no HTML renderizado de todas as rotas (com e sem cookie de idioma).

## 2. Bugs encontrados e corrigidos

### 2.1 Tela de cadastro sem idioma/tema (pedido do usuário)
- **Bug/UX:** a 1ª tela do cadastro (`/onboarding`) não tinha seleção de idioma nem de
  modo escuro/claro — o usuário era obrigado a criar a conta antes de traduzir a interface.
- **Correção:** barra superior em `/onboarding` com `LanguageToggle` + `ThemeToggle` e link
  "Já tem conta? Entrar". Teste e2e cobre a presença dos toggles e o tema via cookie.

### 2.2 Chaves de tradução cruas na interface (17 pontos em 11 telas)
Vazamento de chaves do dicionário exibidas ao usuário (ex.: `wp.activeMinutes`,
`share.copy`) — causa: render de rótulos sem `t()` em `WorkoutPlanner`, `WeeklySection`,
`FoodTable`, `RecipeBrowser`, `MetricsPanel`, `PhotosSection`, `GoalCoachPanel`,
`SharePanel`, `HealthImportPanel`, `AccountPanel`, `CommunityBoard`, `ResetButton`,
`ProgressionPanel`, `AppShell`, `ui.tsx` (`Stat`/`Empty`), `ReminderToggle` e
`ProfileWizard`. **Corrigido**: todo render de chave passa por `t()`/`tr()`.
Varredura final: **0 chaves cruas em 13/13 rotas** (em pt e com cookie `fitvida-lang`).

### 2.3 Variáveis `{{ }}` não interpoladas
- `/alimentacao` — "Restam {{n}} kcal" e "meta {{n}} kcal" (chaves `food.remaining`,
  `food.mealGoal` chamadas sem as variáveis corretas).
- `/hidratacao` — dicas exibindo `{{weight}}`/`{{age}}` crus (`water.tipBase` e
  `water.tipSenior` sem vars; `water.tipWorkout` com `{{ml}}` sem passar `ml`;
  `water.tipClimate` montado com chave errada de clima).
- `/` (dashboard) — "≈ {{n}} semanas", "{{n}} kcal restantes", "{{n}} kcal comidas"
  (`dash.weeksEstimate` com var `weeks` no lugar de `n`; `dash.kcalLeft`/`dash.eaten` sem vars).
- **Corrigido** em todos os pontos; `{{ }}` cru: **zero em todas as rotas**.

### 2.4 Emblemas de gamificação sem tradução
- `/` — emblemas exibindo `game.badge.*`/`game.badgeDesc.*` crus: as chaves não existiam
  nos dicionários (a tradução do módulo `gamification.ts` não as incluiu).
- **Corrigido**: chaves `game.badge.*`, `game.badgeDesc.*`, `game.unit.*` adicionadas aos
  5 idiomas (paridade coberta por teste).

### 2.5 Textos fixos em português em telas traduzidas
- `/exercicios` — "Sugestão:", "Registrar · X kcal" (em `/receitas`), "min/sessão",
  "Cardio:", descanso da semana ("descanso" + dica), "PPL" e textos de sugestão de carga
  (`src/lib/progression.ts`).
- **Corrigido**: chaves `prog.suggestionLabel`, `prog.sug*`, `wp.perSession`, `wp.cardio`,
  `wp.restDay`, `wp.restTip`, `wp.ppl`; `progression.ts` agora devolve `textKey`+`vars`
  (testes unitários cobrem `action`/`nextKg`).

### 2.6 Bugs de processo/regressão descobertos durante a correção
- `ui.tsx` sem `"use client"` na primeira linha: `Stat`/`Empty` passaram a usar hooks e
  o dashboard inteiro caía em error boundary ("useT() from the server"). **Corrigido**
  (diretiva restaurada) — e `fmt` (helper puro usado pelo dashboard server) foi movido
  para `src/lib/format.ts`, com re-export em `ui.tsx` para componentes client.

## 3. Observações e limitações conhecidas (sem correção neste ciclo)

| # | Observação | Severidade | Nota |
|---|-----------|-----------|-------|
| 1 | `addFoodEntries` com `foodKey` inexistente responde **500** (esperaria 400/erro amigável) | Baixa | Comportamento coberto por e2e (`app.test.ts`); mudança exige atualizar o contrato |
| 2 | `/login` e a página pública `/compartilhar/[token]` não têm toggles de idioma/tema | Baixa | Sugestão de UX (ver §4) |
| 3 | `/familia` tem poucas classes `dark:` — dark mode menos consistente nessa tela | Baixa | Layout herdado do CommunityBoard; padronizar em revisão de dark mode |
| 4 | Datas exibidas em pt-BR (`dd/mm`) mesmo com idioma ativo | Baixa | `formatDateBR` aceita locale, mas componentes usam `toLocaleDateString("pt-BR")` fixo; números também em formato pt-BR |
| 5 | Catálogo (alimentos, receitas, exercícios) e nomes de domínio permanecem em PT-BR | Aceito | Decisão registrada no i18n: só UI traduzida; conteúdo do catálogo é PT-BR |
| 6 | `<html lang>` fixo em `pt-BR` independente do cookie de idioma | Baixa | Server components de rota não leem o cookie; impacto em leitores de tela |
| 7 | Wizard pula etapas quando `<profile.trainingTime>` retorna `undefined` (p0-p5) | Baixa | Mascarado pelo redirect de step; risco se o fluxo mudar |
| 8 | Sugestões do coach exibem texto somente em PT-BR (vindas de `goalcoach.ts`/`progression.ts` com interpolações) | Baixa | `progression.ts` corrigido; `goalcoach.ts` é texto determinístico PT (as chaves `coach.apply/applied` já traduzidas) |

## 4. Sugestões de melhoria

### Sistema
1. **Validação de entrada nas actions**: retornar erro tipado (400) para `foodKey`
   inválido em `addFoodEntries` em vez de 500 — atualizar o e2e junto.
2. **`lang` dinâmico no `<html>`**: ler cookie de idioma em `app/layout.tsx` via
   `cookies()` e propagar ao `<html lang>` (e ao `formatDateBR` global).
3. **Formato numérico/datas por locale**: usar `Intl.NumberFormat`/`Intl.DateTimeFormat`
   com o locale ativo (hoje os números ficam pt-BR em todos os idiomas).
4. **Teste de regressão de vazamento de chaves**: varrer o HTML de todas as rotas em
   busca de chaves do dicionário (já adicionado em `tests/e2e/i18n.test.ts`).
5. **Cobertura de dark mode**: auditoria de classes `dark:` por tela (`/familia` é a mais
   fraca) — considerar tokens de cor compartilhados.
6. **Tipagem das chaves de i18n**: trocar `Record<string, string>` por um union gerado das
   chaves do dicionário-base (pt) para o TypeScript acusar chave inexistente em build.

### Experiência do usuário
1. **Toggles de idioma/tema em `/login` e `/compartilhar/[token]`** (mesmo padrão do
   onboarding) — hoje só no shell autenticado e no wizard.
2. **Feedback de progresso no wizard**: mostrar "etapa X de 8" já existe; adicionar
   preenchimento automático de `targetWeightKg` igual ao peso atual quando o usuário
   deixar em branco (hoje erro "Preencha os campos destacados" sem destacar o campo).
3. **Dica de senha no cadastro**: exigência de senha aparece só no erro; sugerir helper
   text "Mínimo de 8 caracteres" antes do envio.
4. **Confirmação destrutiva**: "Limpar tudo" (perfil) já tem diálogo; aplicar o mesmo
   padrão a "Sair da família"/"Revogar convite" (hoje ação imediata).
5. **Hidratação**: permitir registrar valores fora dos atalhos (500/200/300 ml) por campo
   livre na UI principal (hoje só via componente de gráfico).
6. **Comunidade**: indicar "vazio" com CTA (ex.: "Seja o primeiro a publicar") além do
   texto estático; e mostrar contagem de fotos nas receitas.
7. **Acessibilidade**: marcar `aria-label` nos toggles de idioma/tema e `lang` nos blocos
   traduzidos; contraste do texto `text-slate-400` em fundo escuro do sidebar.

## 5. Resultado final da validação

- 13 rotas renderizadas sem chaves cruas e sem `{{ }}` crus (pt e outros idiomas).
- Fluxos de cadastro, rotina diária, comunidade, família e compartilhamento funcionais.
- Bateria de testes: **133/133** (70 unit + 63 e2e), incluindo novos testes de toggles no
  cadastro e de regressão de vazamento de chaves.
- Toggles de idioma e tema disponíveis desde a 1ª tela do cadastro (pedido atendido).
