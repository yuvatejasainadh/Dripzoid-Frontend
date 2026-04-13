// src/utils/images.js
export function normalizeImages(raw) {
  if (!raw && raw !== 0) return [];

  // If already an array -> string-ify each element and trim
  if (Array.isArray(raw)) {
    return raw.map(String).map((s) => s.trim()).filter(Boolean);
  }

  const str = String(raw).trim();
  if (!str) return [];

  // Try JSON parse (handles '["u1","u2"]' or '"single"' variants)
  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) return parsed.map(String).map((s) => s.trim()).filter(Boolean);
    if (typeof parsed === "string" && parsed.trim() !== "") {
      // fallback to comma-splitting that string
      return parsed.split(",").map((s) => s.trim()).filter(Boolean);
    }
  } catch {
    // ignore
  }

  // Normal comma-separated fallback (handles "a, b, c" -> ["a","b","c"])
  const parts = str.split(",").map((s) => s.trim()).filter(Boolean);
  return parts;
}

export default normalizeImages;
