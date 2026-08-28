// Redeemable promo codes. Most catalogs like this would be one-time-per-
// account, but `repeatable: true` codes can be entered over and over — the
// same reward every time, no cap, no cooldown.
const CODES = {
  '0517': { money: 10000, xp: 5000, repeatable: true },
};

function getCode(code) {
  return CODES[code.trim().toUpperCase()] || null;
}

module.exports = { CODES, getCode };
