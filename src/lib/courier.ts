/** "Sandbox-J&T Cargo(Don't modify)" → "J&T Cargo": strips Shopee sandbox prefixes and notes in brackets. */
export const cleanCourier = (c?: string | null) => (c ?? "").replace(/\s*\(.*?\)\s*/g, "").replace(/^Sandbox-/i, "").trim() || "Ekspedisi";
