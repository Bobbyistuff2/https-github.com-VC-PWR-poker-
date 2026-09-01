export const DENOMINATIONS = [
  { value: 1, color: '#f2f1ec', text: '#1a1a1a' },
  { value: 5, color: '#d81e3f', text: '#ffffff' },
  { value: 25, color: '#2c8358', text: '#ffffff' },
  { value: 100, color: '#1c1c1e', text: '#ffffff' },
  { value: 500, color: '#7b4fb0', text: '#ffffff' },
];

export function formatChips(amount) {
  return `$${amount.toLocaleString()}`;
}

// Lets a player type "10k" / "2.5m" instead of spelling out every zero.
// Returns an integer chip amount, or null if the text isn't a parseable
// number (with an optional k/m/b suffix) at all — callers should leave
// whatever the player typed on screen either way, this is just "did it
// resolve to a usable amount".
const SUFFIX_MULTIPLIERS = { k: 1e3, m: 1e6, b: 1e9 };

export function parseChipsInput(raw) {
  const s = String(raw).trim().toLowerCase().replace(/,/g, '');
  if (!s) return null;
  const match = s.match(/^(\d+(?:\.\d+)?)\s*(k|m|b)?$/);
  if (!match) return null;
  const value = parseFloat(match[1]) * (SUFFIX_MULTIPLIERS[match[2]] || 1);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
}

export function decomposeChips(amount) {
  const result = [];
  let remaining = amount;
  for (const d of [...DENOMINATIONS].sort((a, b) => b.value - a.value)) {
    const count = Math.floor(remaining / d.value);
    if (count > 0) {
      result.push({ ...d, count });
      remaining -= count * d.value;
    }
  }
  return result;
}
