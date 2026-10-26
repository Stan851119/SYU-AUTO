export type ListingInput = { make: string; model: string; city: string; year: string; mileage: string; price: string };
export function validateListing(input: ListingInput): string | null {
  for (const [value, max, label] of [[input.make, 60, "Марка"], [input.model, 80, "Модел"], [input.city, 80, "Град"]] as const) {
    if (!value.trim() || value.trim().length > max) return `${label}: въведи от 1 до ${max} символа.`;
  }
  for (const [value, min, max, label] of [[input.year, 1950, Math.min(2030, new Date().getFullYear() + 1), "Година"], [input.mileage, 0, 3000000, "Пробег"], [input.price, 1, 10000000, "Цена"]] as const) {
    const n = Number(value);
    if (!value.trim() || !Number.isInteger(n) || n < min || n > max) return `${label}: въведи цяло число от ${min} до ${max}.`;
  }
  return null;
}
