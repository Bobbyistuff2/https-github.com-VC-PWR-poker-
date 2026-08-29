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
