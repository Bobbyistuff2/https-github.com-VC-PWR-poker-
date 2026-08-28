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
];

const CARD_SKINS = [
  { id: 'cards-classic', slot: 'cardSkin', name: 'Classic Cream', price: 0 },
  { id: 'cards-neon', slot: 'cardSkin', name: 'Neon Nights', price: 350 },
  { id: 'cards-ice', slot: 'cardSkin', name: 'Ice', price: 350 },
  { id: 'cards-sunset', slot: 'cardSkin', name: 'Sunset', price: 450 },
];

const ALL_ITEMS = [...BACKGROUNDS, ...CARD_SKINS];
const BY_ID = new Map(ALL_ITEMS.map((i) => [i.id, i]));

const DEFAULT_BACKGROUND = BACKGROUNDS[0].id;
const DEFAULT_CARD_SKIN = CARD_SKINS[0].id;

function getItem(id) {
  return BY_ID.get(id) || null;
}

module.exports = {
  BACKGROUNDS,
  CARD_SKINS,
  ALL_ITEMS,
  DEFAULT_BACKGROUND,
  DEFAULT_CARD_SKIN,
  getItem,
};
