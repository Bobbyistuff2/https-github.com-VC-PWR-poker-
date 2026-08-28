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
