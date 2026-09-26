export type Comparable = { make: string; model: string; year: number; mileage: number; price: number };
export type Exterior = "excellent" | "normal" | "scratches" | "dents" | "damage";
export type ValuationInput = { make: string; model: string; year: number; mileage: number; exterior: Exterior };
export type Valuation = { low: number; mid: number; high: number; count: number; demo: boolean };

const exteriorFactor: Record<Exterior, number> = {
  excellent: 1.03,
  normal: 1,
  scratches: 0.95,
  dents: 0.90,
  damage: 0.80,
};

// Prototype coefficients: assumptions for a broad guide, not observed sale-price data.
// Use advertised prices of close matches; live mode requires at least three.
export function estimateCar(input: ValuationInput, catalog: Comparable[], demo: boolean): Valuation | null {
  if (!input.make.trim() || !input.model.trim() || !Number.isInteger(input.year) ||
    input.year < 1980 || input.year > new Date().getFullYear() + 1 ||
    !Number.isFinite(input.mileage) || input.mileage < 0 || input.mileage > 1_000_000 ||
    !(input.exterior in exteriorFactor)) return null;

  const matches = catalog.filter((car) => car.make.toLocaleLowerCase("bg") === input.make.toLocaleLowerCase("bg") &&
    car.model.toLocaleLowerCase("bg") === input.model.toLocaleLowerCase("bg") &&
    Math.abs(car.year - input.year) <= 5 && car.price > 0 && car.mileage >= 0);
  if (matches.length < (demo ? 1 : 3)) return null;

  const adjusted = matches.map((car) => {
    const ageAdjustment = Math.max(0.65, Math.min(1.35, 1 + (input.year - car.year) * 0.07));
    const mileageAdjustment = Math.max(0.8, Math.min(1.2, 1 + (car.mileage - input.mileage) / 10_000 * 0.015));
    return car.price * ageAdjustment * mileageAdjustment * exteriorFactor[input.exterior];
  }).sort((a, b) => a - b);
  const middle = Math.floor(adjusted.length / 2);
  const median = adjusted.length % 2 ? adjusted[middle] : (adjusted[middle - 1] + adjusted[middle]) / 2;
  const spread = demo ? 0.2 : 0.15;
  const round = (value: number) => Math.round(value / 100) * 100;
  return { low: round(median * (1 - spread)), mid: round(median), high: round(median * (1 + spread)), count: matches.length, demo };
}
