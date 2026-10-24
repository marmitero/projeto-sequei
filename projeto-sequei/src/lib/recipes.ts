import { FOOD_MAP, Allergen, Origin, allergensOf, originAllowed, dislikeList } from "./foods";

export type Ingredient = { key?: string; text: string; g?: number };

export type Recipe = {
  key: string;
  name: string;
  category: "pizza" | "sorvete" | "lanche" | "paes" | "doces" | "salgados" | "cafe" | "refeicao";
  emoji: string;
  gradient: string;
  time: number;
  servings: number;
  difficulty: "Fácil" | "Média";
  description: string;
  ingredients: Ingredient[];
  steps: string[];
  tags: string[];
};

export const RECIPE_CATEGORIES: Record<Recipe["category"], string> = {
  pizza: "Pizzas",
  sorvete: "Sorvetes",
  lanche: "Lanches",
  paes: "Pães",
  doces: "Doces",
  salgados: "Salgados",
  cafe: "Café da manhã",
  refeicao: "Refeições",
};

const I = (key: string, g: number, text: string): Ingredient => ({ key, g, text });
const T = (text: string): Ingredient => ({ text });

export const RECIPES: Recipe[] = [
  {
    key: "pizza_frango",
    name: "Pizza low-carb com massa de frango",
    category: "pizza",
    emoji: "🍕",
    gradient: "from-orange-400 to-rose-500",
    time: 40,
    servings: 2,
    difficulty: "Fácil",
    description: "Massa feita de frango desfiado, ovos e parmesão: crocante, rica em proteína e quase sem carboidrato.",
    ingredients: [
      I("frango_desfiado", 200, "200 g de peito de frango cozido e desfiado"),
      I("ovo_cru", 100, "2 ovos"),
      I("parmesao", 30, "3 colheres de sopa de parmesão ralado"),
      I("molho_tomate", 60, "3 colheres de sopa de molho de tomate caseiro"),
      I("mucarela", 80, "80 g de muçarela ralada"),
      I("tomate", 60, "1/2 tomate em rodelas"),
      T("Orégano, sal, pimenta e manjericão a gosto"),
    ],
    steps: [
      "Preaqueça o forno a 200 °C.",
      "Processe o frango até ficar com textura de farofa fina. Misture com os ovos, o parmesão, sal e pimenta.",
      "Espalhe a massa em assadeira com papel manteiga formando um disco de ~1 cm.",
      "Asse por 15–20 min até firmar e dourar as bordas.",
      "Cubra com molho, muçarela e tomate. Volte ao forno por 10 min até o queijo gratinar.",
    ],
    tags: ["Alta proteína", "Sem glúten"],
  },
  {
    key: "pizza_couve_flor",
    name: "Pizza de couve-flor",
    category: "pizza",
    emoji: "🥦",
    gradient: "from-lime-400 to-emerald-600",
    time: 50,
    servings: 2,
    difficulty: "Média",
    description: "Base de couve-flor bem sequinha com queijo e ovo. Leve, saborosa e cheia de fibras.",
    ingredients: [
      I("couve_flor", 300, "300 g de couve-flor cozida e espremida"),
      I("ovo_cru", 50, "1 ovo"),
      I("mucarela", 60, "60 g de muçarela ralada (massa)"),
      I("molho_tomate", 60, "3 colheres de sopa de molho de tomate"),
      I("mucarela", 50, "50 g de muçarela para cobrir"),
      I("cogumelo", 50, "50 g de champignon fatiado"),
      T("Orégano e sal a gosto"),
    ],
    steps: [
      "Triture a couve-flor cozida e esprema muito bem num pano limpo para tirar a água — o segredo da crocância.",
      "Misture com o ovo, a muçarela e o sal até formar uma massa.",
      "Abra o disco em papel manteiga e asse a 220 °C por 20 min.",
      "Cubra com molho, queijo e cogumelos e asse por mais 10 min.",
    ],
    tags: ["Rica em fibras", "Vegetariana", "Sem glúten"],
  },
  {
    key: "pizza_frigideira",
    name: "Pizza de frigideira em 10 minutos",
    category: "pizza",
    emoji: "🍳",
    gradient: "from-amber-400 to-orange-600",
    time: 10,
    servings: 1,
    difficulty: "Fácil",
    description: "Para matar a vontade de pizza na hora: massa de ovo e queijo feita na frigideira.",
    ingredients: [
      I("ovo_cru", 100, "2 ovos"),
      I("parmesao", 20, "2 colheres de sopa de parmesão"),
      I("molho_tomate", 30, "1 colher e meia de molho de tomate"),
      I("mucarela", 40, "40 g de muçarela"),
      I("tomate", 40, "Rodelas de tomate"),
      T("Orégano a gosto"),
    ],
    steps: [
      "Bata os ovos com o parmesão e despeje em frigideira antiaderente untada.",
      "Quando firmar, vire, cubra com molho, muçarela e tomate.",
      "Tampe e deixe em fogo baixo até o queijo derreter. Finalize com orégano.",
    ],
    tags: ["Rápida", "Vegetariana", "Sem glúten"],
  },
  {
    key: "sorvete_abacate_cacau",
    name: "Sorvete cremoso de abacate com cacau",
    category: "sorvete",
    emoji: "🍫",
    gradient: "from-amber-700 to-stone-800",
    time: 15,
    servings: 4,
    difficulty: "Fácil",
    description: "Textura de gelato, 100% vegetal e sem açúcar: abacate, cacau e leite de coco.",
    ingredients: [
      I("abacate", 300, "1 abacate médio maduro (300 g de polpa)"),
      I("cacau", 24, "4 colheres de sopa de cacau 100%"),
      I("leite_coco", 100, "1/2 xícara de leite de coco"),
      I("eritritol", 36, "3 colheres de sopa de eritritol"),
      T("1 colher de chá de essência de baunilha e 1 pitada de sal"),
    ],
    steps: [
      "Bata todos os ingredientes no liquidificador até ficar totalmente liso.",
      "Leve ao freezer em pote fechado por 3–4 h, mexendo com um garfo a cada hora para não cristalizar.",
      "Retire 10 min antes de servir para ficar no ponto de bola.",
    ],
    tags: ["Vegano", "Sem lactose", "Sem açúcar"],
  },
  {
    key: "frozen_morango",
    name: "Frozen yogurt de morango proteico",
    category: "sorvete",
    emoji: "🍓",
    gradient: "from-pink-400 to-rose-600",
    time: 10,
    servings: 2,
    difficulty: "Fácil",
    description: "Morangos congelados batidos com iogurte grego e whey. Sorvete instantâneo, rico em proteína.",
    ingredients: [
      I("morango", 200, "200 g de morangos congelados"),
      I("iogurte_grego", 200, "2 potes de iogurte grego natural"),
      I("whey", 30, "1 scoop de whey (baunilha ou morango)"),
      I("eritritol", 12, "1 colher de sopa de eritritol (opcional)"),
    ],
    steps: [
      "Bata tudo no processador até ficar cremoso — use o pulsar para não derreter.",
      "Sirva na hora como soft ou congele por 1 h para ficar mais firme.",
    ],
    tags: ["Alta proteína", "Sem glúten"],
  },
  {
    key: "sorvete_coco",
    name: "Sorvete de coco com chocolate 70%",
    category: "sorvete",
    emoji: "🥥",
    gradient: "from-sky-300 to-indigo-500",
    time: 15,
    servings: 4,
    difficulty: "Fácil",
    description: "Base de leite de coco e creme de leite com raspas de chocolate amargo. Cremoso e cetogênico.",
    ingredients: [
      I("leite_coco", 200, "1 vidro de leite de coco"),
      I("creme_leite", 200, "1 caixinha de creme de leite gelado"),
      I("coco_ralado", 16, "2 colheres de sopa de coco ralado sem açúcar"),
      I("eritritol", 48, "4 colheres de sopa de eritritol"),
      I("chocolate70", 25, "25 g de chocolate 70% picado"),
    ],
    steps: [
      "Bata o creme de leite gelado até engrossar.",
      "Misture delicadamente o leite de coco, o coco ralado e o adoçante.",
      "Incorpore o chocolate picado e leve ao freezer por 4 h, mexendo 2 vezes.",
    ],
    tags: ["Cetogênica", "Sem glúten"],
  },
  {
    key: "burger_nuvem",
    name: "Hambúrguer artesanal no pão de nuvem",
    category: "lanche",
    emoji: "🍔",
    gradient: "from-yellow-500 to-red-600",
    time: 30,
    servings: 2,
    difficulty: "Média",
    description: "Burger de patinho suculento entre dois pães de nuvem, com queijo, alface e tomate.",
    ingredients: [
      I("patinho", 240, "240 g de patinho moído (2 burgers)"),
      I("ovo_cru", 100, "2 ovos (para os pães de nuvem)"),
      I("cream_cheese", 40, "2 colheres de sopa de cream cheese"),
      I("mucarela", 30, "2 fatias de muçarela"),
      I("alface", 30, "Folhas de alface"),
      I("tomate", 60, "Rodelas de tomate"),
      T("Sal, pimenta, alho e páprica a gosto; 1 pitada de fermento"),
    ],
    steps: [
      "Pão de nuvem: separe claras e gemas. Bata as claras em neve com uma pitada de fermento.",
      "Misture as gemas com o cream cheese e incorpore às claras delicadamente.",
      "Faça 4 discos em assadeira com papel manteiga e asse a 160 °C por 20–25 min.",
      "Tempere a carne, modele 2 burgers e grelhe 3–4 min de cada lado; coloque o queijo no final.",
      "Monte com alface e tomate entre dois pães de nuvem.",
    ],
    tags: ["Alta proteína", "Sem glúten"],
  },
  {
    key: "wrap_omelete",
    name: "Wrap de omelete com frango e cream cheese",
    category: "lanche",
    emoji: "🌯",
    gradient: "from-emerald-400 to-teal-600",
    time: 12,
    servings: 1,
    difficulty: "Fácil",
    description: "Omelete fininha que vira tortilha. Recheio de frango, cream cheese e folhas.",
    ingredients: [
      I("ovo_cru", 100, "2 ovos"),
      I("frango_desfiado", 80, "80 g de frango desfiado"),
      I("cream_cheese", 20, "1 colher de sopa de cream cheese"),
      I("rucula", 20, "Punhado de rúcula"),
      I("tomate", 40, "Tomate picado"),
    ],
    steps: [
      "Bata os ovos com sal e faça uma omelete bem fina em frigideira grande.",
      "Espalhe o cream cheese, coloque frango, rúcula e tomate.",
      "Enrole como um wrap e corte ao meio.",
    ],
    tags: ["Alta proteína", "Rápida", "Sem glúten"],
  },
  {
    key: "pao_nuvem",
    name: "Pão de nuvem (cloud bread)",
    category: "paes",
    emoji: "☁️",
    gradient: "from-slate-300 to-sky-500",
    time: 30,
    servings: 4,
    difficulty: "Média",
    description: "Pão levíssimo, sem farinha, perfeito para sanduíches e torradas low-carb.",
    ingredients: [
      I("ovo_cru", 150, "3 ovos"),
      I("cream_cheese", 60, "3 colheres de sopa de cream cheese"),
      I("fermento", 2, "1/2 colher de chá de fermento"),
      T("1 pitada de sal"),
    ],
    steps: [
      "Separe as claras e bata em neve firme com o fermento.",
      "Misture as gemas com o cream cheese até ficar liso.",
      "Incorpore as gemas às claras com movimentos suaves de baixo para cima.",
      "Forme 8 discos e asse a 150 °C por 25–30 min até dourar.",
    ],
    tags: ["Vegetariana", "Sem glúten"],
  },
  {
    key: "pao_caneca",
    name: "Pão de caneca no micro-ondas (90 s)",
    category: "paes",
    emoji: "🥯",
    gradient: "from-amber-300 to-yellow-600",
    time: 5,
    servings: 1,
    difficulty: "Fácil",
    description: "Pão fofinho de farinha de amêndoas e linhaça pronto em 90 segundos.",
    ingredients: [
      I("ovo_cru", 50, "1 ovo"),
      I("farinha_amendoas", 20, "2 colheres de sopa de farinha de amêndoas"),
      I("linhaca", 10, "1 colher de sopa de farinha de linhaça"),
      I("manteiga", 5, "1 colher de chá de manteiga derretida"),
      I("fermento", 3, "1/2 colher de chá de fermento"),
      T("Sal a gosto"),
    ],
    steps: [
      "Misture tudo numa caneca untada até ficar homogêneo.",
      "Micro-ondas por 90 s. Desenforme, corte ao meio e toste na frigideira.",
    ],
    tags: ["Rápida", "Vegetariana", "Sem glúten"],
  },
  {
    key: "pao_queijo_lc",
    name: "Pão de queijo low-carb",
    category: "salgados",
    emoji: "🧀",
    gradient: "from-yellow-300 to-amber-500",
    time: 30,
    servings: 4,
    difficulty: "Fácil",
    description: "Sem polvilho! Muçarela, parmesão, ovo e farinha de amêndoas, puxa-puxa e dourado.",
    ingredients: [
      I("mucarela", 100, "100 g de muçarela ralada"),
      I("parmesao", 40, "40 g de parmesão ralado"),
      I("ovo_cru", 50, "1 ovo"),
      I("farinha_amendoas", 40, "4 colheres de sopa de farinha de amêndoas"),
      I("psyllium", 5, "1 colher de chá de psyllium"),
      I("fermento", 4, "1 colher de chá de fermento"),
    ],
    steps: [
      "Misture todos os ingredientes até formar uma massa que solte das mãos.",
      "Faça 12 bolinhas e asse a 200 °C por 20 min até dourar.",
    ],
    tags: ["Vegetariana", "Sem glúten"],
  },
  {
    key: "chips_parmesao",
    name: "Chips crocantes de parmesão",
    category: "salgados",
    emoji: "🥨",
    gradient: "from-orange-300 to-amber-600",
    time: 10,
    servings: 2,
    difficulty: "Fácil",
    description: "Um único ingrediente, crocância máxima. Ótimo para o happy hour sem sair da dieta.",
    ingredients: [I("parmesao", 60, "60 g de parmesão ralado grosso"), T("Páprica, alecrim ou orégano a gosto")],
    steps: ["Faça montinhos de 1 colher de sopa em papel manteiga.", "Asse a 200 °C por 5–7 min até dourar. Espere esfriar para ficar crocante."],
    tags: ["Cetogênica", "Sem glúten"],
  },
  {
    key: "coxinha_fit",
    name: "Coxinha fit de frango (sem massa)",
    category: "salgados",
    emoji: "🍗",
    gradient: "from-orange-500 to-amber-700",
    time: 35,
    servings: 3,
    difficulty: "Média",
    description: "A massa é o próprio frango, recheada com cream cheese e empanada em farinha de linhaça.",
    ingredients: [
      I("frango_desfiado", 300, "300 g de frango cozido e processado"),
      I("cream_cheese", 60, "3 colheres de sopa de cream cheese"),
      I("ovo_cru", 50, "1 ovo batido"),
      I("linhaca", 30, "3 colheres de sopa de farinha de linhaça"),
      T("Cebola, alho, cheiro-verde e sal a gosto"),
    ],
    steps: [
      "Tempere o frango processado com cebola, alho e cheiro-verde.",
      "Modele as coxinhas recheando com um pouco de cream cheese.",
      "Passe no ovo e na farinha de linhaça.",
      "Asse a 200 °C por 20–25 min ou na airfryer por 15 min.",
    ],
    tags: ["Alta proteína", "Sem glúten"],
  },
  {
    key: "brownie_lc",
    name: "Brownie low-carb de amêndoas",
    category: "doces",
    emoji: "🟫",
    gradient: "from-stone-600 to-amber-900",
    time: 35,
    servings: 8,
    difficulty: "Fácil",
    description: "Casquinha crocante e meio molhadinho por dentro. Chocolate 70%, amêndoas e zero açúcar.",
    ingredients: [
      I("chocolate70", 100, "100 g de chocolate 70%"),
      I("manteiga", 45, "3 colheres de sopa de manteiga"),
      I("ovo_cru", 150, "3 ovos"),
      I("farinha_amendoas", 100, "1 xícara de farinha de amêndoas"),
      I("cacau", 6, "1 colher de sopa de cacau 100%"),
      I("eritritol", 40, "1/3 xícara de eritritol"),
      I("nozes", 30, "30 g de nozes picadas"),
    ],
    steps: [
      "Derreta o chocolate com a manteiga.",
      "Bata os ovos com o eritritol e junte ao chocolate.",
      "Acrescente a farinha de amêndoas e o cacau peneirados, depois as nozes.",
      "Asse em forma forrada a 180 °C por 20–25 min. Corte em 8 quadrados.",
    ],
    tags: ["Vegetariana", "Sem glúten"],
  },
  {
    key: "mousse_abacate",
    name: "Mousse de chocolate com abacate",
    category: "doces",
    emoji: "🍮",
    gradient: "from-green-700 to-stone-800",
    time: 10,
    servings: 3,
    difficulty: "Fácil",
    description: "Ninguém percebe o abacate! Mousse aveludada, vegana e rica em gorduras boas.",
    ingredients: [
      I("abacate", 250, "250 g de polpa de abacate"),
      I("cacau", 18, "3 colheres de sopa de cacau 100%"),
      I("leite_coco", 60, "60 ml de leite de coco"),
      I("eritritol", 30, "2 a 3 colheres de sopa de eritritol"),
      T("Baunilha e 1 pitada de sal"),
    ],
    steps: ["Bata tudo no liquidificador até ficar liso.", "Distribua em potinhos e leve à geladeira por 2 h."],
    tags: ["Vegano", "Sem lactose", "Sem glúten"],
  },
  {
    key: "mug_cake",
    name: "Bolo de caneca de chocolate",
    category: "doces",
    emoji: "🧁",
    gradient: "from-rose-400 to-amber-800",
    time: 5,
    servings: 1,
    difficulty: "Fácil",
    description: "Sobremesa individual em 1 minuto no micro-ondas. Fofinho e chocolatudo.",
    ingredients: [
      I("ovo_cru", 50, "1 ovo"),
      I("farinha_amendoas", 20, "2 colheres de sopa de farinha de amêndoas"),
      I("cacau", 6, "1 colher de sopa de cacau 100%"),
      I("eritritol", 12, "1 colher de sopa de eritritol"),
      I("manteiga", 5, "1 colher de chá de manteiga"),
      I("fermento", 2, "1 pitada de fermento"),
    ],
    steps: ["Misture tudo na caneca.", "Micro-ondas por 60–70 s. Sirva morno."],
    tags: ["Rápida", "Vegetariana", "Sem glúten"],
  },
  {
    key: "pudim_chia",
    name: "Pudim de chia com coco e frutas vermelhas",
    category: "doces",
    emoji: "🫐",
    gradient: "from-indigo-400 to-fuchsia-600",
    time: 5,
    servings: 2,
    difficulty: "Fácil",
    description: "Prepare à noite e tenha um doce pronto pela manhã. Vegano e cheio de fibras.",
    ingredients: [
      I("chia", 36, "3 colheres de sopa de chia"),
      I("leite_coco", 100, "1/2 xícara de leite de coco"),
      I("bebida_amendoas", 100, "1/2 copo de bebida de amêndoas"),
      I("mirtilo", 60, "Mirtilos e morangos"),
      I("eritritol", 12, "Adoçante a gosto"),
    ],
    steps: ["Misture a chia com os líquidos e o adoçante.", "Deixe na geladeira por no mínimo 4 h.", "Sirva com as frutas por cima."],
    tags: ["Vegano", "Rica em fibras", "Sem lactose"],
  },
  {
    key: "panqueca_lc",
    name: "Panqueca low-carb de cream cheese",
    category: "cafe",
    emoji: "🥞",
    gradient: "from-yellow-300 to-orange-500",
    time: 10,
    servings: 1,
    difficulty: "Fácil",
    description: "Só 2 ingredientes base. Sirva com morangos e um fio de pasta de amendoim.",
    ingredients: [
      I("ovo_cru", 100, "2 ovos"),
      I("cream_cheese", 40, "2 colheres de sopa de cream cheese"),
      I("morango", 60, "5 morangos"),
      T("Canela a gosto"),
    ],
    steps: ["Bata os ovos com o cream cheese e a canela.", "Faça panquecas finas em frigideira antiaderente.", "Sirva com morangos."],
    tags: ["Vegetariana", "Sem glúten"],
  },
  {
    key: "tofu_mexido",
    name: "Tofu mexido com legumes",
    category: "cafe",
    emoji: "🌱",
    gradient: "from-green-400 to-lime-600",
    time: 12,
    servings: 1,
    difficulty: "Fácil",
    description: "O 'ovo mexido' vegano: tofu temperado com cúrcuma, espinafre e tomate.",
    ingredients: [
      I("tofu", 150, "150 g de tofu firme"),
      I("espinafre", 40, "Punhado de espinafre"),
      I("tomate", 50, "1/2 tomate picado"),
      I("azeite", 5, "1 colher de chá de azeite"),
      T("Cúrcuma, sal negro (kala namak) e pimenta"),
    ],
    steps: ["Esfarele o tofu com as mãos.", "Refogue no azeite com a cúrcuma, adicione espinafre e tomate.", "Tempere e sirva quente."],
    tags: ["Vegano", "Sem lactose", "Sem glúten"],
  },
  {
    key: "lasanha_abobrinha",
    name: "Lasanha de abobrinha à bolonhesa",
    category: "refeicao",
    emoji: "🍝",
    gradient: "from-red-500 to-orange-600",
    time: 50,
    servings: 4,
    difficulty: "Média",
    description: "Lâminas de abobrinha no lugar da massa, molho bolonhesa e muçarela gratinada.",
    ingredients: [
      I("abobrinha", 400, "2 abobrinhas em lâminas finas"),
      I("patinho", 400, "400 g de patinho moído"),
      I("molho_tomate", 300, "300 g de molho de tomate caseiro"),
      I("mucarela", 150, "150 g de muçarela"),
      I("parmesao", 20, "2 colheres de sopa de parmesão"),
      I("cebola", 50, "1/2 cebola"),
      T("Alho, manjericão e sal a gosto"),
    ],
    steps: [
      "Grelhe as lâminas de abobrinha rapidamente para perderem água.",
      "Refogue cebola e alho, doure a carne e junte o molho de tomate.",
      "Monte camadas: molho, abobrinha, carne, muçarela. Finalize com parmesão.",
      "Asse a 200 °C por 25 min.",
    ],
    tags: ["Alta proteína", "Sem glúten"],
  },
  {
    key: "escondidinho_cf",
    name: "Escondidinho de couve-flor com carne",
    category: "refeicao",
    emoji: "🥘",
    gradient: "from-amber-500 to-red-700",
    time: 40,
    servings: 3,
    difficulty: "Fácil",
    description: "Purê cremoso de couve-flor com requeijão cobrindo carne moída temperada.",
    ingredients: [
      I("couve_flor", 400, "400 g de couve-flor cozida"),
      I("requeijao", 60, "2 colheres de sopa de requeijão"),
      I("patinho", 300, "300 g de patinho moído"),
      I("cebola", 50, "1/2 cebola"),
      I("tomate", 100, "1 tomate"),
      I("parmesao", 20, "2 colheres de sopa de parmesão"),
    ],
    steps: [
      "Bata a couve-flor cozida com o requeijão e sal até virar purê.",
      "Refogue a carne com cebola e tomate.",
      "Coloque a carne no refratário, cubra com o purê e o parmesão.",
      "Gratine a 200 °C por 15 min.",
    ],
    tags: ["Alta proteína", "Sem glúten"],
  },
];

export type RecipeNutrition = {
  kcal: number;
  protein: number;
  carbs: number;
  netCarbs: number;
  fat: number;
  fiber: number;
  gramsPerServing: number;
};

export function recipeNutrition(r: Recipe): RecipeNutrition {
  let kcal = 0, protein = 0, carbs = 0, fat = 0, fiber = 0, grams = 0;
  for (const ing of r.ingredients) {
    if (!ing.key || !ing.g) continue;
    const f = FOOD_MAP[ing.key];
    if (!f) continue;
    const k = ing.g / 100;
    kcal += f.kcal * k;
    protein += f.p * k;
    carbs += f.c * k;
    fat += f.f * k;
    fiber += f.fib * k;
    grams += ing.g;
  }
  const s = r.servings;
  return {
    kcal: Math.round(kcal / s),
    protein: +(protein / s).toFixed(1),
    carbs: +(carbs / s).toFixed(1),
    netCarbs: +(Math.max(carbs - fiber, 0) / s).toFixed(1),
    fat: +(fat / s).toFixed(1),
    fiber: +(fiber / s).toFixed(1),
    gramsPerServing: Math.round(grams / s),
  };
}

export function recipeAllergens(r: Recipe): Allergen[] {
  const set = new Set<Allergen>();
  for (const ing of r.ingredients) if (ing.key) FOOD_MAP[ing.key]?.a.forEach((a) => set.add(a));
  return [...set];
}

export function recipeOrigins(r: Recipe): Origin[] {
  const set = new Set<Origin>();
  for (const ing of r.ingredients) if (ing.key && FOOD_MAP[ing.key]) set.add(FOOD_MAP[ing.key].o);
  return [...set];
}

export function recipeCompatibility(r: Recipe, diet: string, restrictions: string[], dislikes: string) {
  const reasons: string[] = [];
  const origins = recipeOrigins(r);
  if (!origins.every((o) => originAllowed(o, diet))) reasons.push(`Não é compatível com dieta ${diet}`);
  const blocked = allergensOf(restrictions);
  const al = recipeAllergens(r);
  const labels: Record<string, string> = { lac: "lactose", glu: "glúten", nut: "oleaginosas", egg: "ovo", sea: "frutos do mar", pea: "amendoim", soy: "soja" };
  al.filter((a) => blocked.includes(a)).forEach((a) => reasons.push(`Contém ${labels[a]}`));
  const dl = dislikeList(dislikes);
  const text = r.ingredients.map((i) => i.text).join(" ").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  dl.forEach((d) => text.includes(d) && reasons.push(`Contém ${d}`));
  return { ok: reasons.length === 0, reasons };
}
