# Funcionalidades do FitVida

Documentação tela a tela, baseada exclusivamente no código-fonte atual (`projeto-sequei/src`). Nada aqui é especificação futura — o que está descrito **existe e funciona** (ver [TESTES.md](./TESTES.md)).

---

## 1. Onboarding (`/onboarding`)

`ProfileWizard` em modo `create` — 6 etapas com barra de progresso e validação por etapa:

1. **Sobre você** — nome, sexo biológico (M/F), data de nascimento (idade 14–100), altura (120–230 cm), peso (30–300 kg) + IMC ao vivo.
2. **Objetivo** — perder / manter / ganhar massa / recomposição; peso-alvo; ritmo (leve / moderado / acelerado) para perder/ganhar.
3. **Rotina** — nível de atividade (5 níveis com fator multiplicador), horários de acordar/dormir, turno de treino, clima (temperado/quente), nº de refeições (3–6).
4. **Treino** — dias por semana (1–7), duração da sessão (15–180 min), local (academia / casa / ar livre), equipamentos, preferências de cardio, lesões (joelho, lombar, ombro, punho, tornozelo).
5. **Alimentação** — dieta (onívora / vegetariana / vegana / pescetariana), abordagem de carboidrato (equilibrada / low-carb / cetogênica), restrições (lactose, glúten, oleaginosas, amendoim, ovo, frutos do mar, soja), aversões em texto livre.
6. **Saúde e resumo** — condições (diabetes, hipertensão, colesterol, hipotireoidismo, renal, gestante, lactante), aceite e resumo das metas calculadas.

Cada etapa mostra **metas recalculadas em tempo real**: TMB (Mifflin-St Jeor), IMC + classificação, kcal/dia, macros, água, mudança semanal estimada e previsão de semanas até o peso-alvo. Ao salvar (`saveProfile`), o perfil vai ao banco e o cookie `fituid` é definido (2 anos, `httpOnly`).

## 2. Início / Dashboard (`/`)

- Saudação por horário (bom dia/boa tarde/boa noite) no fuso do usuário e resumo do objetivo (peso atual → alvo + previsão de semanas).
- **Anel de calorias**: restantes/estouradas com meta, consumo e calorias queimadas no treino do dia (o anel considera `meta + queimado` como teto).
- Barras de **proteína, carboidrato e gordura** vs. metas.
- **Card de hidratação** com % do dia (meta inclui extra de treino quando há treino previsto/registrado).
- Estatísticas: peso atual (variação desde a 1ª pesagem), IMC + classificação (OMS), treinos nos últimos 7 dias vs. meta semanal, % de proteína.
- **Treino de hoje** (ou próximo dia de treino) a partir do plano gerado; se já houver registro do dia, mostra o treino feito + kcal.
- **Gráfico de evolução de peso** (últimos pontos) com linha do peso-alvo.
- **Receita sugerida do dia**: entre as receitas compatíveis com dieta/restrições/aversões, escolhe as que mais se encaixam nos macros que faltam (dentre as 3 melhores, alterna pelo dia do mês).
- **Recomendações personalizadas** (`personalTips` + notas das metas): distribuição de proteína por refeição, déficit/superávit, dicas por condição de saúde (diabetes, hipotireoidismo, 60+), lesões, low-carb, horário de treino.

## 3. Alimentação (`/alimentacao`)

- **Navegação por data** (`?d=YYYY-MM-DD`; futuro bloqueado) e resumo do dia: anel de kcal, 4 macros com barras e distribuição percentual de calorias por macro.
- **"Feche seu dia"**: quando falta ≥80 kcal, sugere 6 alimentos com maior densidade do macro que mais falta, com gramatura calculada para fechar a meta — cada um com botão de adicionar à última refeição.
- **Diário por refeição** (café, lanche da manhã, almoço, lanche da tarde, jantar, ceia — conforme nº de refeições do perfil), com itens, porções, macros e exclusão.
- **Cardápio sugerido** (`generateMealPlan`): um plano por refeição com metas proporcionais, itens compatíveis com dieta/restrições/aversões/condições de saúde e gramatura arredondada em medidas caseiras. Botão 🎲 troca as opções (seed determinístico + override), e **"Comi isso — registrar"** adiciona o plano inteiro ao diário.
- **Modal de registro** (`AddFoodModal`) com 3 abas:
  - **Alimentos**: busca com acentos opcionais, filtro por categoria, ordenação com compatíveis primeiro, seleção por medida caseira (colher, fatia, unidade…), quantidade em passos de 0,5, "ficha de informação nutricional" estilo rótulo, alerta para alimentos fora do perfil (IG alto, sódio alto, alergênio, dieta) e projeção do impacto no dia;
  - **Receitas**: registra receita inteira com nº de porções (0,25–10), com aviso de incompatibilidade quando houver;
  - **Manual**: alimento livre (nome, kcal, P/C/G) para o que não está na base.

Regras do servidor (`addFoodEntries`): lote de até 30 itens, datas validadas, gramas 1–3000, macros limitados por faixa, receitas calculadas pela base TACO no servidor.

## 4. Treinos (`/exercicios`)

- **Plano semanal gerado** (`generateWorkoutPlan`) a partir de: objetivo (séries/repetições/intervalo/cardio por objetivo), experiência (nível de exercício 1–3), dias/semana (splits: full body A/B/C até 3 dias; superiores/inferiores 4; empurrar/puxar/pernas 5; PPL×2 6–7), local e equipamentos (academia = todos), lesões (exercícios marcados com a articulação envolvida são excluídos), gestação (exclui abdominais infra, escalador, kettlebell swing, superman; sem HIIT).
- Cada sessão mostra: foco, aquecimento, exercícios com séries/reps/intervalo/dica técnica, cardio sugerido (impacto baixo quando há lesão de joelho/tornozelo, IMC≥30, 60+ ou gestação), duração e kcal estimadas (MET × peso × horas).
- Botão de **variação** (gera outra combinação) e seleção de dia da semana.
- **Registro de sessão**: a partir do plano (pré-preenche exercícios, com carga e "feito") ou atividade livre entre as 18 opções com MET (musculação, funcional, 8 cardios, yoga, pilates, alongamento, futebol, beach tennis, lutas, vôlei) — kcal calculadas na tela pelo MET e salvas com data, duração, esforço (1–10) e notas.
- **Histórico** dos últimos 60 dias com remoção de registros.

## 5. Hidratação (`/hidratacao`)

- **Meta diária dinâmica**: base (35 ml/kg; 30 ml/kg acima de 55 anos) + 500 ml (clima quente) + 300 ml (atividade intensa/atleta) + ajustes de gestação (+300) e lactação (+700) + extra de dia de treino (≈500 ml por hora de exercício; 500 ml/h de sessão prevista ou realizada). Arredondada em 50 ml.
- **Garrafa animada** com % do dia, atalhos de registro (100/200/300/500 ml e valor custom 10–3000 ml), chips dos registros do dia com remoção.
- **Cronograma de copos** entre acordar e 1 h antes de dormir (6–12 marcos, ~1 cada 90 min), com marcações "ao acordar" e "perto do treino" — itens cumpridos são riscados conforme o total do dia.
- **Streak** de dias consecutivos ≥90% da meta (últimos 7 dias) e dicas explicando o cálculo da meta e sinais de hidratação.

## 6. Métricas (`/metricas`)

- Formulário por data com upsert (1 registro/dia): peso, % de gordura (manual ou **estimada pela fórmula da Marinha dos EUA** com cintura/pescoço/quadril — aparece como sugestão), cintura, quadril, pescoço, peito, braço, coxa, FC de repouso, horas de sono e observações — todos com faixas de validação.
- **Ao salvar peso, o perfil é atualizado com a medição mais recente** → metas de kcal/macros/água e o plano são recalculados automaticamente em todo o app.
- Gráfico com seletor de série (peso, gordura, medidas, sono, FC) e linha de referência do peso-alvo no gráfico de peso.
- Cards-resumo (peso atual/variação, IMC, % gordura, cintura), **aderência dos últimos 14 dias** (dias com comida registrada, médias de kcal/proteína/água, nº de treinos) e histórico completo com remoção.

## 7. Receitas Low-Carb (`/receitas`)

- 21 receitas em 8 categorias (pizzas, sorvetes, lanches, pães, doces, salgados, café da manhã, refeições) com tempo, dificuldade, porções e tags.
- **Nutrição calculada ingrediente a ingrediente** pela base TACO (kcal, P, C, G, fibras, carboidrato líquido, g/porção).
- Filtros: categoria, "só compatíveis comigo" (dieta, restrições, aversões) e ordenação (melhor encaixe nos macros que faltam hoje, kcal, proteína, tempo).
- Modal da receita: ingredientes, modo de preparo, alergênios e origem dos ingredientes, aviso de incompatibilidade (com o motivo), ajuste de porções e **registro direto no diário** (escolha da refeição).
- Abertura via `?r=<key>` (usada pelo card "receita do dia" do dashboard).

## 8. Tabela Nutricional (`/tabela`)

- Busca entre os 113 alimentos, filtro por categoria e por "só compatíveis comigo".
- Ordenação por nome, kcal, proteína, carboidrato, gordura, fibra e **densidade proteica (P/100 kcal)**.
- **Simulador de porção** (gramatura livre) recalculando toda a linha.
- **Badges**: rico em proteína, low-carb, fonte de fibras, IG (baixo/médio/alto), sódio alto.
- **Comparação de até 3 alimentos** lado a lado.

## 9. Meu perfil (`/perfil`)

- **Conta e backup** (topo da página):
  - Sem conta: convite para **Criar conta** (`/cadastro`) ou **Entrar** (`/login`).
  - Com conta: e-mail conectado e **Sair da conta**.
  - **Exportar dados**: backup JSON completo (perfil + todos os registros) e CSVs por área (perfil, alimentação, água, treinos, métricas) via `GET /api/export`.
  - **Restaurar backup**: importa um backup JSON — registros são adicionados ao histórico (métricas do mesmo dia são atualizadas; perfil é restaurado se presente no arquivo).
- Mesmo wizard do onboarding em modo `edit` (pré-preenchido; aceite já marcado) — qualquer alteração recalcula metas, cardápio, treino e hidratação.
- **Apagar dados**: `resetAccount` remove o perfil e todo o histórico (cascade) e limpa o cookie (com confirmação no navegador).

## 9.1 Conta (`/login` e `/cadastro`)

- **Cadastro**: e-mail + senha (mínimo 8 caracteres). O perfil já registrado no navegador é **vinculado automaticamente** à conta.
- **Login**: sessão de 30 dias (cookie `fit_session`, token hasheado no banco). Em outro dispositivo, o perfil da conta é carregado automaticamente — sem depender do cookie local.
- **Logout**: revoga a sessão e limpa os cookies de identidade do navegador.
- **Proteção**: senhas com scrypt (salt por usuário, comparação em tempo constante); rate limiting por e-mail e por IP em registro e login (mensagens de "muitas tentativas").
- Links cruzados: onboarding → "Já tem conta? Entrar"; login ↔ cadastro; "Continuar sem conta" mantém o modo anônimo.

## 10. API

- `GET /api/health` → `{ ok: true }` se o banco responder (`select 1`); `500 { ok: false }` caso contrário.

---

## Comportamentos transversais

- **Sessão**: cookie `fituid` (UUID, `httpOnly`, `sameSite=lax`, 2 anos). Sem login. Rotas do app redirecionam para `/onboarding` sem cookie.
- **Tudo é recalculado a partir do perfil**: metas (`computeTargets`), cardápio (`generateMealPlan`), treino (`generateWorkoutPlan`), água e dicas — nunca armazenados, sempre derivados (com RNG determinístico por seed para o cardápio/treino).
- **Datas**: "hoje" segue o fuso do usuário (`todayIn`); formatos `YYYY-MM-DD`.
- **Responsivo**: sidebar (desktop), trilho de ícones (tablet), cabeçalho + barra inferior com "Mais" (mobile).
- **Validação no servidor**: números por faixa (clamp), datas por regex, strings com limite de tamanho, lote máximo de itens, upsert por `(usuário, data)` em métricas.

## 10. Fase 2 — Profundidade (biblioteca, atalhos e relatórios)

### 10.1 Meus alimentos e favoritos
- **Meus alimentos** (`custom_foods`): cadastro manual pelo modal de adicionar (aba “Manual”, com opção “salvar também em Meus alimentos”), por código de barras (botão “Salvar”) e edição por recriação (excluir + cadastrar). Campos: nome, porção (g + rótulo), kcal, proteína, carboidrato, gordura e fibra.
- **Favoritos** (`favorites`): estrela em alimentos da base, receitas e alimentos pessoais. Aba “Favoritos” no modal reúne tudo com adição em 1 toque.
- **Registrar pelo id**: entradas podem referenciar `customId`; o snapshot no diário mantém nome/gramas/macros da porção usada.

### 10.2 Repetir refeição
- Botão “Repetir esta refeição de ontem” (ícone de copiar) no cabeçalho de cada refeição do diário: copia todos os itens da mesma refeição da data anterior para a data atual (`copyMeal`), mantendo gramas e porções.

### 10.3 Código de barras (Open Food Facts)
- Aba “Código” no modal: digitação do código (6–14 dígitos) → consulta server-side à API pública do Open Food Facts (`lookupBarcode`) com timeout de 6 s e limite de 30 consultas/min.
- Produto encontrado → cartão com macros/100 g, “Adicionar 100 g” ou “Salvar” na biblioteca. Não encontrado/sem internet → mensagem amigável (sem erro 500).
- Observação: a consulta real depende de acesso à internet do servidor; em ambiente offline a funcionalidade degrada com aviso.

### 10.4 Lista de compras
- Página **Compras** (`/compras`, no menu): lista gerada automaticamente do cardápio sugerido dos próximos 7 dias, agregada por alimento (gramatura total arredondada) e agrupada por categoria TACO, com medida de porção aproximada e kcal.
- Checklist com marcação persistida no navegador (`localStorage`), contador de progresso e “limpar marcações”.

### 10.5 Progressão de força
- Seção **Progressão de força** na página de Treinos: escolha do exercício (a partir dos treinos registrados), gráfico de carga por sessão (SVG), últimas sessões (carga, séries×reps, esforço) e sugestão heurística:
  - < 2 sessões → sem sugestão;
  - 2 sessões na mesma carga com esforço médio ≤ 8 → +5% (arredondado em 0,5 kg);
  - esforço ≥ 9 → manter carga;
  - carga em queda → deload (−10%).
- **“Fiz isso”** em 1 toque: registra a sessão de hoje com a carga sugerida (`logWorkout`).
- A carga é lida do campo `load` dos exercícios do treino (ex.: “40 kg”, “20,5kg”).

### 10.6 Relatório semanal e tendências
- Topo da página **Métricas**: “Relatório semanal” com a semana corrente (dias com registro, kcal/dia, proteína/dia, dias de hidratação ≥ 90% da meta, treinos, variação de peso) e comparação com a semana anterior (%).
- Tendências das últimas 4 semanas (barras) para calorias e treinos.

### Critério de sucesso (Fase 2)
- 7 dias consecutivos de uso sem registro manual; ≥30% dos registros via favoritos/repetição. As métricas de uso por fonte ainda não são instrumentadas (a base de dados já permite derivar: entradas com `foodKey`/`recipeKey` repetidas vs. manuais).

## 11. Fase 3 — Engajamento

### 11.1 Modo escuro
- Toggle no topo (celular) e no fim da barra lateral (desktop); persiste em `localStorage` (`fitvida-theme`), com fallback para a preferência do sistema. Script inline no `<html>` aplica o tema antes da primeira pintura (sem "piscada").
- Paleta: Tailwind v4 com remapeamento das variáveis em `.dark` (escala `slate` invertida; `-50/-100` de emerald/amber/rose/sky/orange escurecidos); textos `text-white` preservados para contraste em botões coloridos.

### 11.2 Lembretes (notificações do navegador)
- Botão de sino (AppShell) ativa notificações via Notification API. Enquanto o app estiver aberto, um agendador dispara:
  - **Água**: copos de 250 ml distribuídos entre `wakeTime + 30min` e `sleepTime − 60min` (3–10 lembretes conforme a meta);
  - **Treino**: 1 lembrete no período preferido (`trainingTime`: manhã = acordar + 1h; tarde = 13h; noite = 19h); seg–sex quando `trainingDays ≥ 3`;
  - **Pesagem**: 1x/semana (segunda, por padrão) às `wakeTime + 45min`.
- Estado em `fitvida-reminders`; cada disparo tem "chave do dia" para não repetir.

### 11.3 Gamificação
- Painel **"Sequências e marcos"** no dashboard: streaks de alimentação (com recorde), água e treino (dias consecutivos, tolerando "hoje ainda sem registro"), + 16 marcos (Constância 🍽️ ×4, Hidratação 💧 ×3, Força do hábito 💪 ×3, Balança amiga ⚖️ ×3, Semana completa 🔥 ×3) com progresso.
- Derivado dos registros existentes (sem tabelas novas) — `src/lib/gamification.ts` (função pura).

### 11.4 Fotos de progresso
- Em `/metricas`: upload (JPEG/PNG/WebP até 2,5 MB, data + anotação), galeria e **comparação lado a lado** (selecione 2 fotos) + exclusão.
- Tabela `progress_photos` (migração `0002`); bytes no banco (app pessoal). API: `POST/GET /api/photos`, `GET/DELETE /api/photos/[id]`.

### 11.5 Import de dados de saúde (Apple Health / Google Fit)
- Em `/perfil` → **"Importar dados de saúde"**: envia `export.xml` do Apple Health (Pessoal → Exportar) ou CSV de peso (Takeout do Google Fit / planilha com colunas de data + peso).
- Extrai **peso (kg/lb)**, **% de gordura** e **horas de sono** por data e grava nas métricas do dia (`/api/health-import`, até 8 MB). Aceita decimal vírgula e separador `;` (export BR). Sem OAuth — importação offline por arquivo.

### 11.6 PWA
- `manifest.webmanifest` (standalone, pt-BR, ícone `/icon.png` 512), `sw.js` com cache de assets imutáveis (`/_next/static/`, ícone, manifest) e fallback offline para navegações. Registro automático no layout raiz.
