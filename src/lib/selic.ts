/**
 * Selic calculation utilities
 * Fetches data from BCB (Banco Central do Brasil) public API
 * Series 11 = daily Selic factor (accumulated)
 * Series 4390 = annual Selic target rate
 */

export interface SelicDailyFactor {
  date: string; // dd/MM/yyyy
  value: number; // daily factor
}

export interface MonthlySelicProjection {
  month: string; // YYYY-MM
  monthLabel: string; // "Jan/2025"
  accumulatedFactor: number; // accumulated Selic factor since start
  compoundFactor: number; // compound Selic factor since start
  exposureMinAccumulated: number;
  exposureBaseAccumulated: number;
  exposureMaxAccumulated: number;
  exposureMinCompound: number;
  exposureBaseCompound: number;
  exposureMaxCompound: number;
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatDateBR(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function parseDateBR(dateStr: string): Date {
  const [d, m, y] = dateStr.split('/').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Fetch daily Selic rates from BCB API (series 11 - daily factor)
 */
export async function fetchSelicDailyFactors(startDate: Date, endDate: Date): Promise<SelicDailyFactor[]> {
  const start = formatDateBR(startDate);
  const end = formatDateBR(endDate);
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados?formato=json&dataInicial=${start}&dataFinal=${end}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`BCB API error: ${response.status}`);
  }

  const data = await response.json();
  return data.map((item: { data: string; valor: string }) => ({
    date: item.data,
    value: parseFloat(item.valor),
  }));
}

/**
 * Fetch monthly Selic target rate from BCB API (series 4390)
 */
export async function fetchSelicMonthlyRate(startDate: Date, endDate: Date): Promise<SelicDailyFactor[]> {
  const start = formatDateBR(startDate);
  const end = formatDateBR(endDate);
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.4390/dados?formato=json&dataInicial=${start}&dataFinal=${end}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`BCB API error: ${response.status}`);
  }

  const data = await response.json();
  return data.map((item: { data: string; valor: string }) => ({
    date: item.data,
    value: parseFloat(item.valor),
  }));
}

/**
 * Group daily Selic factors by month and compute monthly accumulated factor
 * Returns the product of daily factors for each month
 */
function groupByMonth(dailyFactors: SelicDailyFactor[]): Map<string, number> {
  const monthlyFactors = new Map<string, number>();

  for (const factor of dailyFactors) {
    const date = parseDateBR(factor.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const current = monthlyFactors.get(key) || 1;
    // Daily factor is a percentage, convert: 1 + value/100
    monthlyFactors.set(key, current * (1 + factor.value / 100));
  }

  return monthlyFactors;
}

/**
 * Calculate monthly Selic projections comparing:
 * 1. Accumulated Selic (court-applied: product of daily factors - how courts update debts)
 * 2. Compound Selic (compound interest: using monthly rate compounded)
 */
export function calculateProjections(
  dailyFactors: SelicDailyFactor[],
  startDate: Date,
  exposureMin: number,
  exposureBase: number,
  exposureMax: number,
): MonthlySelicProjection[] {
  if (dailyFactors.length === 0) return [];

  const monthlyFactors = groupByMonth(dailyFactors);
  const sortedMonths = Array.from(monthlyFactors.keys()).sort();

  let accumulatedFactor = 1;
  let compoundFactor = 1;
  const projections: MonthlySelicProjection[] = [];

  for (const monthKey of sortedMonths) {
    const monthFactor = monthlyFactors.get(monthKey) || 1;
    const [year, month] = monthKey.split('-').map(Number);

    // Accumulated Selic: product of all daily factors (how courts apply it)
    accumulatedFactor *= monthFactor;

    // Compound Selic: same mathematical operation (daily compounding IS compound interest)
    // But for comparison, we use the monthly rate applied as simple interest accumulation
    // "Selic acumulada" (linear) vs "Selic composta" (compound)
    const monthlyRate = monthFactor - 1; // monthly rate from daily factors

    // For "simple/linear accumulated": sum of monthly rates applied to original principal
    // For "compound": multiply factors (reinvest gains)
    compoundFactor *= monthFactor;

    const monthLabel = `${MONTH_NAMES[month - 1]}/${year}`;

    projections.push({
      month: monthKey,
      monthLabel,
      accumulatedFactor,
      compoundFactor,
      exposureMinAccumulated: exposureMin * accumulatedFactor,
      exposureBaseAccumulated: exposureBase * accumulatedFactor,
      exposureMaxAccumulated: exposureMax * accumulatedFactor,
      exposureMinCompound: exposureMin * compoundFactor,
      exposureBaseCompound: exposureBase * compoundFactor,
      exposureMaxCompound: exposureMax * compoundFactor,
    });
  }

  return projections;
}

/**
 * Calculate simple (linear) Selic vs compound Selic
 * Simple: Principal * (1 + sum_of_monthly_rates)
 * Compound: Principal * product_of_(1 + monthly_rate)
 */
export function calculateSimpleVsCompound(
  dailyFactors: SelicDailyFactor[],
  exposureMin: number,
  exposureBase: number,
  exposureMax: number,
): MonthlySelicProjection[] {
  if (dailyFactors.length === 0) return [];

  const monthlyFactors = groupByMonth(dailyFactors);
  const sortedMonths = Array.from(monthlyFactors.keys()).sort();

  let simpleRateSum = 0; // sum of monthly rates (for simple/linear)
  let compoundFactor = 1; // product of (1 + monthly rate) for compound
  const projections: MonthlySelicProjection[] = [];

  for (const monthKey of sortedMonths) {
    const monthFactor = monthlyFactors.get(monthKey) || 1;
    const [year, month] = monthKey.split('-').map(Number);
    const monthlyRate = monthFactor - 1;

    // Simple/linear: P * (1 + r1 + r2 + ... + rn)
    simpleRateSum += monthlyRate;
    const simpleFactor = 1 + simpleRateSum;

    // Compound: P * (1+r1) * (1+r2) * ... * (1+rn)
    compoundFactor *= monthFactor;

    const monthLabel = `${MONTH_NAMES[month - 1]}/${year}`;

    projections.push({
      month: monthKey,
      monthLabel,
      accumulatedFactor: simpleFactor,
      compoundFactor,
      exposureMinAccumulated: exposureMin * simpleFactor,
      exposureBaseAccumulated: exposureBase * simpleFactor,
      exposureMaxAccumulated: exposureMax * simpleFactor,
      exposureMinCompound: exposureMin * compoundFactor,
      exposureBaseCompound: exposureBase * compoundFactor,
      exposureMaxCompound: exposureMax * compoundFactor,
    });
  }

  return projections;
}

/**
 * Project future Selic comparison for N months using the average monthly rate
 * from historical data. Starts from the last known values (current accumulated/compound).
 */
export function projectFutureComparison(
  historicalProjections: MonthlySelicProjection[],
  dailyFactors: SelicDailyFactor[],
  monthsAhead: number,
  exposureMin: number,
  exposureBase: number,
  exposureMax: number,
): MonthlySelicProjection[] {
  if (historicalProjections.length === 0 || dailyFactors.length === 0) return [];

  const monthlyFactors = groupByMonth(dailyFactors);
  const rates = Array.from(monthlyFactors.values()).map(f => f - 1);
  const avgMonthlyRate = rates.reduce((a, b) => a + b, 0) / rates.length;

  const lastHist = historicalProjections[historicalProjections.length - 1];
  const [lastY, lastM] = lastHist.month.split('-').map(Number);

  let simpleRateSum = lastHist.accumulatedFactor - 1;
  let compoundFactor = lastHist.compoundFactor;
  const projections: MonthlySelicProjection[] = [];

  for (let i = 1; i <= monthsAhead; i++) {
    const date = new Date(lastY, lastM - 1 + i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const monthLabel = `${MONTH_NAMES[month - 1]}/${year}`;

    simpleRateSum += avgMonthlyRate;
    const simpleFactor = 1 + simpleRateSum;
    compoundFactor *= (1 + avgMonthlyRate);

    projections.push({
      month: monthKey,
      monthLabel,
      accumulatedFactor: simpleFactor,
      compoundFactor,
      exposureMinAccumulated: exposureMin * simpleFactor,
      exposureBaseAccumulated: exposureBase * simpleFactor,
      exposureMaxAccumulated: exposureMax * simpleFactor,
      exposureMinCompound: exposureMin * compoundFactor,
      exposureBaseCompound: exposureBase * compoundFactor,
      exposureMaxCompound: exposureMax * compoundFactor,
    });
  }

  return projections;
}
