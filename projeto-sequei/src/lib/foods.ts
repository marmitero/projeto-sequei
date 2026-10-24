// Base nutricional por 100 g — fonte principal: TACO 4ª edição (NEPA/UNICAMP).
// Itens marcados com src "USDA" vêm do USDA FoodData Central ou rótulos médios de mercado.

export type Allergen = "lac" | "glu" | "nut" | "egg" | "sea" | "pea" | "soy";
export type Origin = "meat" | "fish" | "dairy" | "egg" | "plant" | "honey";
export type Role = "protein" | "carb" | "fat" | "veg" | "fruit" | "dairy" | "legume" | "drink" | "other";

export type Portion = { l: string; g: number };

export type Food = {
  key: string;
  name: string;
  cat: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
  fib: number;
  portions: Portion[];
  a: Allergen[];
  o: Origin;
  role: Role;
  src?: "TACO" | "USDA" | "Média";
  gi?: "baixo" | "medio" | "alto";
  sodium?: "alto";
};

export const FOOD_CATEGORIES = [
  "Cereais e tubérculos",
  "Leguminosas",
  "Carnes e aves",
  "Peixes e frutos do mar",
  "Ovos",
  "Laticínios",
  "Frutas",
  "Verduras e legumes",
  "Oleaginosas e sementes",
  "Gorduras e óleos",
  "Low-carb e confeitaria",
  "Bebidas",
  "Preparações",
] as const;

const P = (l: string, g: number): Portion => ({ l, g });

type Row = [
  key: string,
  name: string,
  cat: (typeof FOOD_CATEGORIES)[number],
  kcal: number,
  p: number,
  c: number,
  f: number,
  fib: number,
  portions: Portion[],
  a: Allergen[],
  o: Origin,
  role: Role,
  extra?: Partial<Pick<Food, "src" | "gi" | "sodium">>,
];

const rows: Row[] = [
  // Cereais e tubérculos
  ["arroz_branco", "Arroz branco cozido", "Cereais e tubérculos", 128, 2.5, 28.1, 0.2, 1.6, [P("1 colher de servir", 45), P("1 escumadeira cheia", 90)], [], "plant", "carb", { gi: "alto" }],
  ["arroz_integral", "Arroz integral cozido", "Cereais e tubérculos", 124, 2.6, 25.8, 1.0, 2.7, [P("1 colher de servir", 45), P("1 escumadeira cheia", 90)], [], "plant", "carb", { gi: "medio" }],
  ["aveia", "Aveia em flocos", "Cereais e tubérculos", 394, 13.9, 66.6, 8.5, 9.1, [P("1 colher de sopa", 15), P("3 colheres de sopa", 45)], ["glu"], "plant", "carb", { gi: "baixo" }],
  ["pao_frances", "Pão francês", "Cereais e tubérculos", 300, 8.0, 58.6, 3.1, 2.3, [P("1 unidade", 50)], ["glu"], "plant", "carb", { gi: "alto" }],
  ["pao_integral", "Pão de forma integral", "Cereais e tubérculos", 253, 9.4, 49.9, 3.7, 6.9, [P("1 fatia", 25), P("2 fatias", 50)], ["glu"], "plant", "carb", { gi: "medio" }],
  ["macarrao", "Macarrão cozido", "Cereais e tubérculos", 157, 5.8, 30.9, 0.9, 1.8, [P("1 pegador", 110), P("1 prato raso", 200)], ["glu", "egg"], "plant", "carb", { src: "USDA", gi: "medio" }],
  ["tapioca", "Goma de tapioca hidratada", "Cereais e tubérculos", 240, 0, 59, 0, 0, [P("1 tapioca média", 60), P("1 tapioca grande", 80)], [], "plant", "carb", { src: "Média", gi: "alto" }],
  ["cuscuz", "Cuscuz de milho cozido", "Cereais e tubérculos", 113, 2.2, 25.3, 0.7, 2.1, [P("1 fatia média", 100), P("1 pedaço pequeno", 60)], [], "plant", "carb", { gi: "medio" }],
  ["batata_doce", "Batata-doce cozida", "Cereais e tubérculos", 77, 0.6, 18.4, 0.1, 2.2, [P("1 unidade média", 150), P("1 pedaço pequeno", 80)], [], "plant", "carb", { gi: "baixo" }],
  ["batata", "Batata inglesa cozida", "Cereais e tubérculos", 52, 1.2, 11.9, 0, 1.3, [P("1 unidade média", 140)], [], "plant", "carb", { gi: "alto" }],
  ["mandioca", "Mandioca cozida", "Cereais e tubérculos", 125, 0.6, 30.1, 0.3, 1.6, [P("1 pedaço médio", 100)], [], "plant", "carb", { gi: "medio" }],
  ["inhame", "Inhame cozido", "Cereais e tubérculos", 97, 2.1, 23.2, 0.2, 1.7, [P("1 unidade média", 120)], [], "plant", "carb", { gi: "baixo" }],
  ["quinoa", "Quinoa cozida", "Cereais e tubérculos", 120, 4.4, 21.3, 1.9, 2.8, [P("1 colher de sopa cheia", 25), P("1 xícara", 150)], [], "plant", "carb", { src: "USDA", gi: "baixo" }],
  ["granola", "Granola sem açúcar", "Cereais e tubérculos", 400, 10, 60, 13, 8, [P("2 colheres de sopa", 25)], ["glu", "nut"], "plant", "carb", { src: "Média", gi: "medio" }],
  ["milho", "Milho verde (lata, drenado)", "Cereais e tubérculos", 98, 3.2, 17.1, 2.4, 4.6, [P("2 colheres de sopa", 40)], [], "plant", "carb", { gi: "medio" }],
  ["pao_queijo", "Pão de queijo", "Cereais e tubérculos", 363, 5.1, 34.2, 24.6, 0.6, [P("1 unidade média", 30)], ["lac", "egg"], "dairy", "other", { gi: "alto" }],

  // Leguminosas
  ["feijao_carioca", "Feijão carioca cozido", "Leguminosas", 76, 4.8, 13.6, 0.5, 8.5, [P("1 concha média", 85), P("1 concha cheia", 140)], [], "plant", "legume", { gi: "baixo" }],
  ["feijao_preto", "Feijão preto cozido", "Leguminosas", 77, 4.5, 14.0, 0.5, 8.4, [P("1 concha média", 85), P("1 concha cheia", 140)], [], "plant", "legume", { gi: "baixo" }],
  ["lentilha", "Lentilha cozida", "Leguminosas", 93, 6.3, 16.3, 0.5, 7.9, [P("1 concha média", 90)], [], "plant", "legume", { gi: "baixo" }],
  ["grao_de_bico", "Grão-de-bico cozido", "Leguminosas", 164, 8.9, 27.4, 2.6, 7.6, [P("1 colher de servir", 50), P("1 xícara", 160)], [], "plant", "legume", { src: "USDA", gi: "baixo" }],
  ["tofu", "Tofu", "Leguminosas", 64, 6.6, 2.1, 4.0, 0.8, [P("1 fatia", 50), P("1 porção", 120)], ["soy"], "plant", "protein"],
  ["pts", "Proteína texturizada de soja (seca)", "Leguminosas", 333, 51.5, 33.9, 1.2, 17.5, [P("3 colheres de sopa", 30)], ["soy"], "plant", "protein", { src: "USDA" }],
  ["hummus", "Homus (pasta de grão-de-bico)", "Leguminosas", 166, 7.9, 14.3, 9.6, 6.0, [P("1 colher de sopa", 20)], [], "plant", "fat", { src: "USDA" }],

  // Carnes e aves
  ["frango_peito", "Peito de frango grelhado", "Carnes e aves", 159, 32.0, 0, 2.5, 0, [P("1 filé médio", 120), P("1 filé pequeno", 80)], [], "meat", "protein"],
  ["frango_desfiado", "Frango cozido desfiado", "Carnes e aves", 163, 31.5, 0, 3.2, 0, [P("1 colher de sopa", 20), P("1 xícara", 140)], [], "meat", "protein"],
  ["frango_coxa", "Coxa de frango assada s/ pele", "Carnes e aves", 167, 26.9, 0, 5.8, 0, [P("1 coxa", 70)], [], "meat", "protein"],
  ["patinho", "Patinho moído grelhado", "Carnes e aves", 219, 35.9, 0, 7.3, 0, [P("1 colher de servir", 50), P("1 porção", 120)], [], "meat", "protein"],
  ["contrafile", "Contrafilé grelhado s/ gordura", "Carnes e aves", 194, 35.9, 0, 4.5, 0, [P("1 bife médio", 120)], [], "meat", "protein"],
  ["file_mignon", "Filé-mignon grelhado", "Carnes e aves", 220, 32.8, 0, 8.8, 0, [P("1 medalhão", 100)], [], "meat", "protein"],
  ["lombo", "Lombo suíno assado", "Carnes e aves", 210, 35.7, 0, 6.4, 0, [P("1 fatia média", 100)], [], "meat", "protein"],
  ["peito_peru", "Peito de peru defumado", "Carnes e aves", 110, 18, 3, 2.5, 0, [P("1 fatia", 15), P("4 fatias", 60)], [], "meat", "protein", { src: "Média", sodium: "alto" }],

  // Peixes
  ["tilapia", "Tilápia grelhada", "Peixes e frutos do mar", 128, 26.2, 0, 2.7, 0, [P("1 filé", 120)], ["sea"], "fish", "protein", { src: "USDA" }],
  ["salmao", "Salmão grelhado", "Peixes e frutos do mar", 229, 23.9, 0, 14.0, 0, [P("1 posta", 120)], ["sea"], "fish", "protein"],
  ["atum", "Atum em lata (água)", "Peixes e frutos do mar", 116, 25.5, 0, 0.8, 0, [P("1 lata drenada", 120), P("2 colheres de sopa", 40)], ["sea"], "fish", "protein", { src: "USDA", sodium: "alto" }],
  ["sardinha", "Sardinha em conserva", "Peixes e frutos do mar", 285, 15.9, 0, 24.0, 0, [P("1 lata drenada", 85)], ["sea"], "fish", "protein", { sodium: "alto" }],
  ["camarao", "Camarão cozido", "Peixes e frutos do mar", 90, 19.0, 0, 1.0, 0, [P("10 unidades médias", 100)], ["sea"], "fish", "protein"],

  // Ovos
  ["ovo", "Ovo cozido", "Ovos", 146, 13.3, 0.6, 9.5, 0, [P("1 unidade", 50), P("2 unidades", 100)], ["egg"], "egg", "protein"],
  ["ovo_cru", "Ovo inteiro (cru)", "Ovos", 143, 13.0, 1.6, 8.9, 0, [P("1 unidade", 50)], ["egg"], "egg", "protein"],
  ["clara", "Clara de ovo", "Ovos", 59, 13.4, 0, 0.1, 0, [P("1 clara", 33), P("3 claras", 100)], ["egg"], "egg", "protein"],

  // Laticínios
  ["leite_desnatado", "Leite desnatado", "Laticínios", 35, 3.4, 4.9, 0, 0, [P("1 copo", 200), P("1 xícara", 240)], ["lac"], "dairy", "dairy"],
  ["leite_integral", "Leite integral", "Laticínios", 61, 3.1, 4.7, 3.2, 0, [P("1 copo", 200)], ["lac"], "dairy", "dairy"],
  ["iogurte_natural", "Iogurte natural integral", "Laticínios", 51, 4.1, 1.9, 3.0, 0, [P("1 pote", 170)], ["lac"], "dairy", "dairy"],
  ["iogurte_desnatado", "Iogurte natural desnatado", "Laticínios", 41, 3.8, 5.8, 0.3, 0, [P("1 pote", 170)], ["lac"], "dairy", "dairy"],
  ["iogurte_grego", "Iogurte grego natural s/ açúcar", "Laticínios", 100, 9.0, 4.0, 5.0, 0, [P("1 pote", 100)], ["lac"], "dairy", "dairy", { src: "Média" }],
  ["cottage", "Queijo cottage", "Laticínios", 98, 11.1, 3.4, 4.3, 0, [P("1 colher de sopa", 30), P("1/2 pote", 100)], ["lac"], "dairy", "protein", { src: "USDA" }],
  ["ricota", "Ricota", "Laticínios", 140, 12.6, 3.8, 8.1, 0, [P("1 fatia", 30)], ["lac"], "dairy", "protein"],
  ["minas_frescal", "Queijo minas frescal", "Laticínios", 264, 17.4, 3.2, 20.2, 0, [P("1 fatia", 30)], ["lac"], "dairy", "protein"],
  ["mucarela", "Muçarela", "Laticínios", 330, 22.6, 3.0, 25.2, 0, [P("1 fatia", 15), P("1/2 xícara ralada", 50)], ["lac"], "dairy", "fat"],
  ["parmesao", "Parmesão ralado", "Laticínios", 453, 35.6, 1.7, 33.5, 0, [P("1 colher de sopa", 10)], ["lac"], "dairy", "fat", { sodium: "alto" }],
  ["requeijao", "Requeijão cremoso", "Laticínios", 257, 9.6, 2.4, 23.4, 0, [P("1 colher de sopa", 30)], ["lac"], "dairy", "fat"],
  ["cream_cheese", "Cream cheese", "Laticínios", 342, 5.9, 4.1, 34.2, 0, [P("1 colher de sopa", 20)], ["lac"], "dairy", "fat", { src: "USDA" }],
  ["creme_leite", "Creme de leite", "Laticínios", 221, 1.5, 4.5, 22.5, 0, [P("1 colher de sopa", 15), P("1 caixinha", 200)], ["lac"], "dairy", "fat"],
  ["whey", "Whey protein concentrado", "Laticínios", 400, 80, 8, 6, 0, [P("1 scoop", 30)], ["lac"], "dairy", "protein", { src: "Média" }],

  // Frutas
  ["banana", "Banana prata", "Frutas", 98, 1.3, 26.0, 0.1, 2.0, [P("1 unidade", 70)], [], "plant", "fruit", { gi: "medio" }],
  ["maca", "Maçã fuji", "Frutas", 56, 0.3, 15.2, 0, 1.3, [P("1 unidade", 130)], [], "plant", "fruit", { gi: "baixo" }],
  ["mamao", "Mamão papaia", "Frutas", 40, 0.5, 10.4, 0.1, 1.0, [P("1/2 unidade", 150)], [], "plant", "fruit", { gi: "medio" }],
  ["morango", "Morango", "Frutas", 30, 0.9, 6.8, 0.3, 1.7, [P("10 unidades", 120)], [], "plant", "fruit", { gi: "baixo" }],
  ["abacate", "Abacate", "Frutas", 96, 1.2, 6.0, 8.4, 6.3, [P("2 colheres de sopa", 45), P("1/2 unidade", 200)], [], "plant", "fat", { gi: "baixo" }],
  ["laranja", "Laranja pera", "Frutas", 37, 1.0, 8.9, 0.1, 0.8, [P("1 unidade", 140)], [], "plant", "fruit", { gi: "baixo" }],
  ["melancia", "Melancia", "Frutas", 33, 0.9, 8.1, 0, 0.1, [P("1 fatia média", 200)], [], "plant", "fruit", { gi: "alto" }],
  ["abacaxi", "Abacaxi", "Frutas", 48, 0.9, 12.3, 0.1, 1.0, [P("1 fatia", 75)], [], "plant", "fruit", { gi: "medio" }],
  ["manga", "Manga palmer", "Frutas", 72, 0.4, 19.4, 0.2, 1.6, [P("1/2 unidade", 150)], [], "plant", "fruit", { gi: "medio" }],
  ["uva", "Uva itália", "Frutas", 53, 0.7, 13.6, 0.2, 0.9, [P("10 uvas", 80)], [], "plant", "fruit", { gi: "medio" }],
  ["kiwi", "Kiwi", "Frutas", 51, 1.3, 11.5, 0.6, 2.7, [P("1 unidade", 76)], [], "plant", "fruit", { gi: "baixo" }],
  ["pera", "Pera", "Frutas", 53, 0.6, 14.0, 0.1, 3.0, [P("1 unidade", 130)], [], "plant", "fruit", { gi: "baixo" }],
  ["mirtilo", "Mirtilo (blueberry)", "Frutas", 57, 0.7, 14.5, 0.3, 2.4, [P("1/2 xícara", 75)], [], "plant", "fruit", { src: "USDA", gi: "baixo" }],
  ["coco_ralado", "Coco ralado seco s/ açúcar", "Frutas", 660, 6.9, 23.7, 64.5, 16.3, [P("1 colher de sopa", 8)], [], "plant", "fat", { src: "USDA" }],

  // Verduras e legumes
  ["alface", "Alface crespa", "Verduras e legumes", 11, 1.3, 1.7, 0.2, 1.8, [P("1 prato de sobremesa", 50)], [], "plant", "veg"],
  ["tomate", "Tomate", "Verduras e legumes", 15, 1.1, 3.1, 0.2, 1.2, [P("1 unidade média", 100), P("4 rodelas", 60)], [], "plant", "veg"],
  ["brocolis", "Brócolis cozido", "Verduras e legumes", 25, 2.1, 4.4, 0.5, 3.4, [P("1 xícara", 90)], [], "plant", "veg"],
  ["couve_flor", "Couve-flor cozida", "Verduras e legumes", 19, 1.2, 3.9, 0.3, 2.1, [P("1 xícara", 100)], [], "plant", "veg"],
  ["abobrinha", "Abobrinha cozida", "Verduras e legumes", 15, 1.1, 3.0, 0.2, 1.6, [P("1 xícara", 100), P("1 unidade média", 200)], [], "plant", "veg"],
  ["cenoura", "Cenoura crua", "Verduras e legumes", 34, 1.3, 7.7, 0.2, 3.2, [P("2 colheres de sopa ralada", 30), P("1 unidade", 100)], [], "plant", "veg"],
  ["espinafre", "Espinafre refogado", "Verduras e legumes", 67, 2.7, 4.2, 5.4, 2.5, [P("2 colheres de sopa", 50)], [], "plant", "veg"],
  ["pepino", "Pepino", "Verduras e legumes", 10, 0.9, 2.0, 0, 1.1, [P("1/2 unidade", 80)], [], "plant", "veg"],
  ["couve", "Couve refogada", "Verduras e legumes", 90, 1.7, 8.7, 6.6, 5.7, [P("2 colheres de sopa", 40)], [], "plant", "veg"],
  ["rucula", "Rúcula", "Verduras e legumes", 13, 1.8, 2.2, 0.1, 1.7, [P("1 prato de sobremesa", 40)], [], "plant", "veg"],
  ["berinjela", "Berinjela cozida", "Verduras e legumes", 19, 0.7, 4.5, 0.1, 2.5, [P("1 xícara", 100)], [], "plant", "veg"],
  ["abobora", "Abóbora cabotiá cozida", "Verduras e legumes", 48, 1.4, 10.8, 0.7, 2.5, [P("1 pedaço médio", 100)], [], "plant", "veg"],
  ["cebola", "Cebola", "Verduras e legumes", 39, 1.7, 8.9, 0.1, 2.2, [P("1/2 unidade", 50)], [], "plant", "veg"],
  ["pimentao", "Pimentão", "Verduras e legumes", 21, 1.1, 4.9, 0.2, 2.6, [P("1/2 unidade", 60)], [], "plant", "veg"],
  ["cogumelo", "Cogumelo champignon", "Verduras e legumes", 22, 3.1, 3.3, 0.3, 1.0, [P("1 xícara", 70)], [], "plant", "veg", { src: "USDA" }],
  ["vagem", "Vagem cozida", "Verduras e legumes", 25, 1.8, 5.3, 0.3, 2.4, [P("1 xícara", 100)], [], "plant", "veg"],
  ["beterraba", "Beterraba cozida", "Verduras e legumes", 32, 1.3, 7.2, 0.1, 1.9, [P("2 colheres de sopa", 40)], [], "plant", "veg"],
  ["molho_tomate", "Molho de tomate caseiro", "Verduras e legumes", 38, 1.4, 7.7, 0.2, 1.4, [P("2 colheres de sopa", 40)], [], "plant", "other", { src: "Média" }],

  // Oleaginosas e sementes
  ["castanha_para", "Castanha-do-pará", "Oleaginosas e sementes", 643, 14.5, 15.1, 63.5, 7.9, [P("1 unidade", 4), P("3 unidades", 12)], ["nut"], "plant", "fat"],
  ["castanha_caju", "Castanha de caju torrada", "Oleaginosas e sementes", 570, 18.5, 29.1, 46.3, 3.7, [P("10 unidades", 20)], ["nut"], "plant", "fat"],
  ["amendoa", "Amêndoa torrada", "Oleaginosas e sementes", 581, 18.6, 29.5, 47.3, 11.6, [P("10 unidades", 12)], ["nut"], "plant", "fat"],
  ["nozes", "Nozes", "Oleaginosas e sementes", 620, 14.0, 18.4, 59.4, 7.2, [P("3 unidades", 15)], ["nut"], "plant", "fat"],
  ["amendoim", "Amendoim torrado", "Oleaginosas e sementes", 606, 22.5, 18.7, 54.0, 7.8, [P("1 colher de sopa", 15)], ["pea"], "plant", "fat"],
  ["pasta_amendoim", "Pasta de amendoim integral", "Oleaginosas e sementes", 588, 25, 20, 50, 6, [P("1 colher de sopa", 15)], ["pea"], "plant", "fat", { src: "USDA" }],
  ["linhaca", "Linhaça / farinha de linhaça", "Oleaginosas e sementes", 495, 14.1, 43.3, 32.3, 33.5, [P("1 colher de sopa", 10)], [], "plant", "fat"],
  ["chia", "Chia", "Oleaginosas e sementes", 486, 16.5, 42.1, 30.7, 34.4, [P("1 colher de sopa", 12)], [], "plant", "fat", { src: "USDA" }],

  // Gorduras
  ["azeite", "Azeite de oliva extravirgem", "Gorduras e óleos", 884, 0, 0, 100, 0, [P("1 colher de chá", 4), P("1 colher de sopa", 13)], [], "plant", "fat"],
  ["manteiga", "Manteiga", "Gorduras e óleos", 726, 0.4, 0.1, 82.4, 0, [P("1 ponta de faca", 5), P("1 colher de sopa", 15)], ["lac"], "dairy", "fat"],
  ["oleo_coco", "Óleo de coco", "Gorduras e óleos", 892, 0, 0, 99.1, 0, [P("1 colher de sopa", 13)], [], "plant", "fat", { src: "USDA" }],
  ["leite_coco", "Leite de coco", "Gorduras e óleos", 166, 1.0, 2.2, 18.4, 0.7, [P("1/2 xícara", 100), P("1 vidro", 200)], [], "plant", "fat"],

  // Low-carb e confeitaria
  ["farinha_amendoas", "Farinha de amêndoas", "Low-carb e confeitaria", 571, 21.4, 21.4, 50, 10.7, [P("1 colher de sopa", 10), P("1 xícara", 100)], ["nut"], "plant", "fat", { src: "USDA" }],
  ["farinha_coco", "Farinha de coco", "Low-carb e confeitaria", 400, 19, 59, 14, 38, [P("1 colher de sopa", 8)], [], "plant", "other", { src: "Média" }],
  ["psyllium", "Psyllium", "Low-carb e confeitaria", 160, 2, 85, 0.5, 80, [P("1 colher de sopa", 7)], [], "plant", "other", { src: "Média" }],
  ["cacau", "Cacau em pó 100%", "Low-carb e confeitaria", 228, 19.6, 57.9, 13.7, 37.0, [P("1 colher de sopa", 6)], [], "plant", "other", { src: "USDA" }],
  ["chocolate70", "Chocolate 70% cacau", "Low-carb e confeitaria", 598, 7.8, 45.9, 42.6, 10.9, [P("1 quadradinho", 5), P("1 barra pequena", 25)], ["lac"], "plant", "fat", { src: "USDA" }],
  ["eritritol", "Eritritol (adoçante)", "Low-carb e confeitaria", 0, 0, 0, 0, 0, [P("1 colher de sopa", 12)], [], "plant", "other", { src: "Média" }],
  ["fermento", "Fermento químico em pó", "Low-carb e confeitaria", 90, 0, 44, 0, 0, [P("1 colher de chá", 4)], [], "plant", "other", { src: "Média" }],
  ["mel", "Mel", "Low-carb e confeitaria", 309, 0, 84.0, 0, 0, [P("1 colher de chá", 7), P("1 colher de sopa", 20)], [], "honey", "other", { gi: "alto" }],

  // Bebidas
  ["cafe", "Café coado sem açúcar", "Bebidas", 2, 0.1, 0.3, 0, 0, [P("1 xícara", 50), P("1 caneca", 200)], [], "plant", "drink"],
  ["suco_laranja", "Suco de laranja natural", "Bebidas", 33, 0.7, 7.6, 0.1, 0, [P("1 copo", 200)], [], "plant", "drink", { gi: "medio" }],
  ["agua_coco", "Água de coco", "Bebidas", 22, 0, 5.3, 0, 0.1, [P("1 copo", 200)], [], "plant", "drink"],
  ["bebida_amendoas", "Bebida de amêndoas s/ açúcar", "Bebidas", 15, 0.5, 0.3, 1.2, 0.2, [P("1 copo", 200)], ["nut"], "plant", "drink", { src: "Média" }],

  // Preparações
  ["pizza_mucarela", "Pizza de muçarela (tradicional)", "Preparações", 270, 11, 33, 10, 2, [P("1 fatia", 110)], ["lac", "glu"], "dairy", "other", { src: "Média" }],
  ["barra_proteina", "Barra de proteína", "Preparações", 360, 30, 35, 12, 8, [P("1 barra", 45)], ["lac", "nut"], "dairy", "protein", { src: "Média" }],
  ["omelete", "Omelete simples (2 ovos)", "Preparações", 154, 10.6, 1.0, 11.7, 0, [P("1 omelete", 120)], ["egg"], "egg", "protein", { src: "Média" }],
  ["salada_mista", "Salada mista (folhas + tomate)", "Preparações", 14, 1.2, 2.5, 0.2, 1.5, [P("1 prato", 120)], [], "plant", "veg", { src: "Média" }],
];

export const FOODS: Food[] = rows.map(([key, name, cat, kcal, p, c, f, fib, portions, a, o, role, extra]) => ({
  key,
  name,
  cat,
  kcal,
  p,
  c,
  f,
  fib,
  portions: [...portions, P("100 g", 100)],
  a,
  o,
  role,
  src: extra?.src ?? "TACO",
  gi: extra?.gi,
  sodium: extra?.sodium,
}));

export const FOOD_MAP: Record<string, Food> = Object.fromEntries(FOODS.map((f) => [f.key, f]));

export function macrosFor(food: Food, grams: number) {
  const k = grams / 100;
  return {
    kcal: Math.round(food.kcal * k),
    protein: +(food.p * k).toFixed(1),
    carbs: +(food.c * k).toFixed(1),
    fat: +(food.f * k).toFixed(1),
    fiber: +(food.fib * k).toFixed(1),
  };
}

export type DietFilter = {
  diet: string;
  restrictions: string[];
  dislikes: string;
};

const RESTRICTION_TO_ALLERGEN: Record<string, Allergen> = {
  lactose: "lac",
  gluten: "glu",
  oleaginosas: "nut",
  ovo: "egg",
  frutos_do_mar: "sea",
  amendoim: "pea",
  soja: "soy",
};

export function allergensOf(restrictions: string[]): Allergen[] {
  return restrictions.map((r) => RESTRICTION_TO_ALLERGEN[r]).filter(Boolean);
}

export function originAllowed(o: Origin, diet: string) {
  if (diet === "vegano") return o === "plant";
  if (diet === "vegetariano") return o !== "meat" && o !== "fish";
  if (diet === "pescetariano") return o !== "meat";
  return true;
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function dislikeList(dislikes: string) {
  return dislikes
    .split(/[,;\n]/)
    .map((s) => normalize(s.trim()))
    .filter((s) => s.length > 2);
}

export function foodAllowed(food: Food, filter: DietFilter) {
  if (!originAllowed(food.o, filter.diet)) return false;
  const blocked = allergensOf(filter.restrictions);
  if (food.a.some((a) => blocked.includes(a))) return false;
  const dl = dislikeList(filter.dislikes);
  const n = normalize(food.name);
  if (dl.some((d) => n.includes(d))) return false;
  return true;
}

export function bestPortion(food: Food, grams: number) {
  const opts = food.portions.filter((p) => p.l !== "100 g");
  let best: { label: string; diff: number } | null = null;
  for (const p of opts) {
    const qty = grams / p.g;
    const rounded = Math.round(qty * 2) / 2;
    if (rounded < 0.5) continue;
    const diff = Math.abs(qty - rounded) / qty;
    const label = `${rounded.toString().replace(".", ",")}× ${p.l}`;
    if (!best || diff < best.diff) best = { label, diff };
  }
  return best && best.diff < 0.25 ? best.label : "";
}

export function searchFoods(query: string, list: Food[] = FOODS) {
  const q = normalize(query.trim());
  if (!q) return list;
  const terms = q.split(/\s+/);
  return list
    .map((f) => {
      const n = normalize(f.name + " " + f.cat);
      const ok = terms.every((t) => n.includes(t));
      const score = normalize(f.name).startsWith(q) ? 0 : 1;
      return { f, ok, score };
    })
    .filter((x) => x.ok)
    .sort((a, b) => a.score - b.score)
    .map((x) => x.f);
}
