/**
 * Seed de desenvolvimento: conta demo + perfil + alguns registros de exemplo.
 * Uso: DATABASE_URL=... npx tsx scripts/seed.ts
 */
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { accounts, users, foodLogs, waterLogs, workoutLogs, metrics } from "../src/db/schema";
import { hashPassword } from "../src/lib/password";

const EMAIL = "demo@fitvida.app";
const PASSWORD = "demo1234";

async function main() {
  // Conta demo (idempotente)
  let account = (await db.select().from(accounts).where(eq(accounts.email, EMAIL)))[0];
  if (!account) {
    account = (
      await db
        .insert(accounts)
        .values({ email: EMAIL, passwordHash: hashPassword(PASSWORD) })
        .returning()
    )[0];
    console.log(`Conta criada: ${EMAIL} / ${PASSWORD}`);
  } else {
    console.log(`Conta já existe: ${EMAIL}`);
  }

  // Perfil demo vinculado à conta
  let user = (await db.select().from(users).where(eq(users.accountId, account.id)))[0];
  if (!user) {
    user = (
      await db
        .insert(users)
        .values({
          accountId: account.id,
          name: "Pessoa Demo",
          sex: "F",
          birthDate: "1994-05-12",
          heightCm: 165,
          weightKg: 72.4,
          targetWeightKg: 62,
          goal: "perder",
          pace: "moderado",
          activityLevel: "leve",
          experience: "iniciante",
          trainingDays: 3,
          sessionMinutes: 60,
          location: "casa",
          equipment: ["halteres", "elastico"],
          cardioPrefs: ["caminhada", "bike"],
          injuries: [],
          diet: "onivoro",
          carbApproach: "equilibrado",
          restrictions: [],
          dislikes: "",
          healthConditions: [],
          mealsPerDay: 5,
          wakeTime: "06:30",
          sleepTime: "22:30",
          trainingTime: "manha",
          climate: "temperado",
          timezone: "America/Sao_Paulo",
        })
        .returning()
    )[0];
    console.log(`Perfil criado para ${EMAIL}`);
  }

  const today = new Date().toISOString().slice(0, 10);

  const hasLogs = (await db.select().from(foodLogs).where(eq(foodLogs.userId, user.id)).limit(1)).length > 0;
  if (!hasLogs) {
    await db.insert(foodLogs).values([
      { userId: user.id, date: today, meal: "cafe", foodKey: "ovo", name: "Ovo cozido", grams: 100, portionLabel: "2 unidades", kcal: 146, protein: 13.3, carbs: 0.6, fat: 9.5, fiber: 0 },
      { userId: user.id, date: today, meal: "almoco", foodKey: "frango_peito", name: "Peito de frango grelhado", grams: 120, portionLabel: "1 filé médio", kcal: 191, protein: 38.4, carbs: 0, fat: 3, fiber: 0 },
    ]);
    await db.insert(waterLogs).values([
      { userId: user.id, date: today, ml: 250 },
      { userId: user.id, date: today, ml: 500 },
    ]);
    await db.insert(workoutLogs).values([
      {
        userId: user.id,
        date: today,
        title: "Full body A",
        kind: "forca",
        durationMin: 55,
        kcal: 320,
        effort: 7,
        exercises: [{ name: "Agachamento livre (peso corporal)", sets: 3, reps: "12–15", done: true }],
        notes: "Seed de demonstração",
      },
    ]);
    await db.insert(metrics).values([{ userId: user.id, date: today, weightKg: 72.1, waistCm: 82, notes: "seed" }]);
    console.log("Registros de exemplo criados para hoje.");
  } else {
    console.log("Registros já existem — nada inserido.");
  }

  console.log(`\n✔ Seed concluído. Login: ${EMAIL} / ${PASSWORD}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
