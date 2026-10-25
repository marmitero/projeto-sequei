// Importação de dados de saúde (Apple Health / Google Fit) — parsers puros.
// - Apple Health: `export.xml` com tags <Record type="HKQuantityTypeIdentifier..." .../>.
// - Google Fit (Takeout): CSV com colunas de data + peso (kg).
export type HealthPoint = { date: string; value: number };
export type HealthImportData = {
  weights: HealthPoint[];
  bodyFat: HealthPoint[];
  sleep: HealthPoint[];
};

const dayOf = (s: string) => s.slice(0, 10);
const isDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

function attr(tag: string, name: string): string | null {
  const m = new RegExp(`${name}="([^"]*)"`).exec(tag);
  return m ? m[1] : null;
}

/** "2026-10-20 23:10:00 -0300" (HealthKit) → timestamp; tolera outros formatos. */
function parseHealthDate(s: string): number {
  const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/.exec(s);
  if (m) return Date.parse(`${m[1]}T${m[2]}${m[3]}:${m[4]}`);
  return Date.parse(s.replace(" ", "T"));
}

function num(s: string | null): number | null {
  if (s == null) return null;
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Lê o export.xml do Apple Health (peso, % gordura, sono). Tolerante a arquivos grandes. */
export function parseAppleHealthXml(xml: string): HealthImportData {
  const out: HealthImportData = { weights: [], bodyFat: [], sleep: [] };
  const records = xml.matchAll(/<Record\s[^>]*\/?>/g);
  const sleepByDay = new Map<string, number>();

  for (const [tag] of records) {
    const type = attr(tag, "type") ?? "";
    const start = attr(tag, "startDate") ?? "";
    const date = dayOf(start);
    if (!isDay(date)) continue;

    if (type === "HKQuantityTypeIdentifierBodyMass") {
      const raw = num(attr(tag, "value"));
      if (raw == null || raw <= 0 || raw > 500) continue;
      const unit = (attr(tag, "unit") ?? "kg").toLowerCase();
      const kg = unit.startsWith("lb") ? raw * 0.45359237 : raw;
      out.weights.push({ date, value: +kg.toFixed(1) });
    } else if (type === "HKQuantityTypeIdentifierBodyFatPercentage") {
      const raw = num(attr(tag, "value"));
      if (raw == null || raw < 0 || raw > 1) continue;
      out.bodyFat.push({ date, value: +(raw * 100).toFixed(1) });
    } else if (type === "HKCategoryTypeIdentifierSleepAnalysis") {
      const end = attr(tag, "endDate") ?? "";
      const t0 = parseHealthDate(start);
      const t1 = parseHealthDate(end);
      if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 <= t0) continue;
      const hours = (t1 - t0) / 3_600_000;
      if (hours > 24) continue;
      sleepByDay.set(date, (sleepByDay.get(date) ?? 0) + hours);
    }
  }
  for (const [date, hours] of sleepByDay) {
    out.sleep.push({ date, value: +Math.min(hours, 24).toFixed(1) });
  }
  return out;
}

/** Lê CSV de peso (Google Fit Takeout, planilhas…). Colunas: data + peso em kg. */
export function parseWeightCsv(text: string): HealthImportData {
  const out: HealthImportData = { weights: [], bodyFat: [], sleep: [] };
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return out;

  const sep = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
  const header = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ""));
  const dateCol = header.findIndex((h) => /(date|data|dia|start)/.test(h));
  // prefere coluna em kg; ignora lb
  let weightCol = header.findIndex((h) => /(weight|peso|massa|mass)/.test(h) && /kg|kgs|quilos/.test(h));
  if (weightCol < 0) weightCol = header.findIndex((h) => /(weight|peso|massa|mass)/.test(h) && !/lb/.test(h));
  const fatCol = header.findIndex((h) => /(fat|gordura)/.test(h) && /%|pct|percent/.test(h));
  if (dateCol < 0 || weightCol < 0) return out;

  for (const line of lines.slice(1)) {
    const cells = line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    const rawDate = cells[dateCol] ?? "";
    const date = rawDate.slice(0, 10);
    if (!isDay(date)) continue;
    const kg = num(cells[weightCol]);
    if (kg != null && kg > 0 && kg < 500) out.weights.push({ date, value: +kg.toFixed(1) });
    if (fatCol >= 0) {
      const fat = num(cells[fatCol]);
      if (fat != null && fat >= 0 && fat <= 100) out.bodyFat.push({ date, value: +fat.toFixed(1) });
    }
  }
  return out;
}

/** Detecta o formato pelo conteúdo (xml/csv). */
export function parseHealthFile(content: string): HealthImportData {
  return content.trimStart().startsWith("<") ? parseAppleHealthXml(content) : parseWeightCsv(content);
}
