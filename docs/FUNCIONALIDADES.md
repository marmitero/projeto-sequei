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

- Mesmo wizard do onboarding em modo `edit` (pré-preenchido; aceite já marcado) — qualquer alteração recalcula metas, cardápio, treino e hidratação.
- **Apagar dados**: `resetAccount` remove o usuário e todo o histórico (cascade) e limpa o cookie (com confirmação no navegador).

## 10. API

- `GET /api/health` → `{ ok: true }` se o banco responder (`select 1`); `500 { ok: false }` caso contrário.

---

## Comportamentos transversais

- **Sessão**: cookie `fituid` (UUID, `httpOnly`, `sameSite=lax`, 2 anos). Sem login. Rotas do app redirecionam para `/onboarding` sem cookie.
- **Tudo é recalculado a partir do perfil**: metas (`computeTargets`), cardápio (`generateMealPlan`), treino (`generateWorkoutPlan`), água e dicas — nunca armazenados, sempre derivados (com RNG determinístico por seed para o cardápio/treino).
- **Datas**: "hoje" segue o fuso do usuário (`todayIn`); formatos `YYYY-MM-DD`.
- **Responsivo**: sidebar (desktop), trilho de ícones (tablet), cabeçalho + barra inferior com "Mais" (mobile).
- **Validação no servidor**: números por faixa (clamp), datas por regex, strings com limite de tamanho, lote máximo de itens, upsert por `(usuário, data)` em métricas.
