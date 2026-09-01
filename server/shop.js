// Cosmetic catalog: table felt backgrounds and card skins. Purely visual —
// nothing here affects odds, payouts, or gameplay. Each item's id is what
// gets stored in user_items and in users.equipped_background /
// equipped_card_skin; the "default" (price 0) item in each slot is never
// actually written to user_items — everyone owns it implicitly, it's just
// what an unset equipped_* column falls back to.
const BACKGROUNDS = [
  { id: 'bg-classic', slot: 'background', name: 'Classic Gold', price: 0 },
  { id: 'bg-crimson', slot: 'background', name: 'Crimson & Gold', price: 400 },
  { id: 'bg-emerald', slot: 'background', name: 'Emerald', price: 400 },
  { id: 'bg-midnight', slot: 'background', name: 'Midnight Blue', price: 500 },
  { id: 'bg-royal', slot: 'background', name: 'Royal Purple', price: 600 },
  { id: 'bg-obsidian', slot: 'background', name: 'Obsidian', price: 500 },
  { id: 'bg-teal', slot: 'background', name: 'Teal Dream', price: 550 },
  { id: 'bg-sunset', slot: 'background', name: 'Sunset Blaze', price: 550 },
  { id: 'bg-rose', slot: 'background', name: 'Rose Gold', price: 650 },
  // A prestige-priced flex item, matching the new Unreal rank in name only —
  // buying it has no bearing on rank and vice versa, same as every other
  // item here.
  { id: 'bg-unreal', slot: 'background', name: 'Unreal Prestige', price: 3000 },
  // A textured card-suit pattern instead of a plain color wash, in three
  // tints — same underlying texture, recolored via CSS filter client-side
  // rather than three separate image files.
  { id: 'bg-cardnoir', slot: 'background', name: 'Card Noir', price: 500 },
  { id: 'bg-cardpattern-ruby', slot: 'background', name: 'Ruby Deck', price: 600 },
  { id: 'bg-cardpattern-sapphire', slot: 'background', name: 'Sapphire Deck', price: 600 },
];

const CARD_SKINS = [
  { id: 'cards-classic', slot: 'cardSkin', name: 'Classic Cream', price: 0 },
  { id: 'cards-neon', slot: 'cardSkin', name: 'Neon Nights', price: 350 },
  { id: 'cards-ice', slot: 'cardSkin', name: 'Ice', price: 350 },
  { id: 'cards-sunset', slot: 'cardSkin', name: 'Sunset', price: 450 },
  { id: 'cards-obsidian', slot: 'cardSkin', name: 'Obsidian', price: 400 },
  { id: 'cards-teal', slot: 'cardSkin', name: 'Teal Dream', price: 400 },
  { id: 'cards-rose', slot: 'cardSkin', name: 'Rose Gold', price: 450 },
  { id: 'cards-unreal', slot: 'cardSkin', name: 'Unreal Prestige', price: 2500 },
  // A genuinely different look rather than a border tint on the usual dark
  // card — a solid-color face (black/navy/wine) with gold rank and suit,
  // both colors, no red/black distinction. An elegant/luxury option players
  // opt into, not the default.
  { id: 'cards-gold-noir', slot: 'cardSkin', name: 'Gold Noir', price: 500 },
  { id: 'cards-gold-navy', slot: 'cardSkin', name: 'Gold Navy', price: 500 },
  { id: 'cards-gold-ruby', slot: 'cardSkin', name: 'Gold Ruby', price: 550 },
];

// The effect that plays over a win — at the poker table and in the 777
// Slots jackpot/triple. "Falling Chips" is what everyone already had before
// this was purchasable, so it stays the free default; nothing already
// playing changes for existing accounts. The other four are cosmetic-only
// purchases, same as every other shop item.
const CELEBRATIONS = [
  { id: 'cele-chips', slot: 'celebration', name: 'Falling Chips', price: 0 },
  { id: 'cele-cards', slot: 'celebration', name: 'Falling Cards', price: 400 },
  { id: 'cele-diamonds', slot: 'celebration', name: 'Falling Diamonds', price: 700 },
  { id: 'cele-money', slot: 'celebration', name: 'Falling Money', price: 700 },
  { id: 'cele-orbs', slot: 'celebration', name: 'Orbs of Light', price: 850 },
];

// Wheel-exclusive rewards — never buyable with chips, only ever granted by
// landing on them on the Daily wheel (see wheel.js's daily segments and
// server.js's /api/wheel/spin handler). `price: null` marks that. They
// still equip through the exact same slot/column system as everything
// else, and still show up in their normal Shop section once owned (tagged
// "Wheel Exclusive" there) — winning one should feel like unlocking a real
// shop item, not a dead end with nowhere to use it.
const EXOTIC_ITEMS = [
  { id: 'wheel-bg-aurora', slot: 'background', name: 'Aurora Felt', price: null, tier: 'Rare' },
  { id: 'wheel-bg-nebula', slot: 'background', name: 'Nebula Void', price: null, tier: 'Rare' },
  { id: 'wheel-cards-holo', slot: 'cardSkin', name: 'Holographic', price: null, tier: 'Epic' },
  { id: 'wheel-cele-fireworks', slot: 'celebration', name: 'Fireworks', price: null, tier: 'Epic' },
];

const ALL_ITEMS = [...BACKGROUNDS, ...CARD_SKINS, ...CELEBRATIONS, ...EXOTIC_ITEMS];
const BY_ID = new Map(ALL_ITEMS.map((i) => [i.id, i]));

const DEFAULT_BACKGROUND = BACKGROUNDS[0].id;
const DEFAULT_CARD_SKIN = CARD_SKINS[0].id;
const DEFAULT_CELEBRATION = CELEBRATIONS[0].id;

// Which users.equipped_* column each shop slot writes to — used by the
// buy/equip routes in server.js so adding a new slot never needs an
// if/else chain there.
const SLOT_COLUMNS = {
  background: 'equipped_background',
  cardSkin: 'equipped_card_skin',
  celebration: 'equipped_celebration',
};

function getItem(id) {
  return BY_ID.get(id) || null;
}

module.exports = {
  BACKGROUNDS,
  CARD_SKINS,
  CELEBRATIONS,
  EXOTIC_ITEMS,
  ALL_ITEMS,
  DEFAULT_BACKGROUND,
  DEFAULT_CARD_SKIN,
  DEFAULT_CELEBRATION,
  SLOT_COLUMNS,
  getItem,
};
