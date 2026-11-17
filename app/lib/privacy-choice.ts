export const CHOICE_KEY = "mmc-privacy-v1";
export const CHOICE_VERSION = 1;
export const CHOICE_LIFETIME = 180 * 24 * 60 * 60 * 1000;
export function parseChoice(raw: string | null, now = Date.now()): { analytics: boolean; savedAt: number } | null {
  try {
    const v = JSON.parse(raw || "null");
    if (!v || v.version !== CHOICE_VERSION || typeof v.analytics !== "boolean" || !Number.isFinite(v.savedAt) || v.savedAt > now || now - v.savedAt >= CHOICE_LIFETIME) return null;
    return { analytics: v.analytics, savedAt: v.savedAt };
  } catch { return null; }
}
export function serializeChoice(analytics: boolean, now = Date.now()) {
  return JSON.stringify({ version: CHOICE_VERSION, analytics, savedAt: now });
}
