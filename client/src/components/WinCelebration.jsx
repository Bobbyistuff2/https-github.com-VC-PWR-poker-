import ChipRain from './ChipRain.jsx';
import CelebrationRain from './CelebrationRain.jsx';

// Picks the right rain effect for a win based on the player's equipped
// celebration (see server/shop.js's CELEBRATIONS) — used at the poker
// table and in 777 Slots, so buying one changes the effect everywhere a
// win plays, not just in one place. 'cele-chips' is the free default,
// same effect every account already had before this was purchasable.
export default function WinCelebration({ celebration, count }) {
  switch (celebration) {
    case 'cele-cards':
      return <CelebrationRain variant="cards" count={count} />;
    case 'cele-diamonds':
      return <CelebrationRain variant="diamonds" count={count} />;
    case 'cele-money':
      return <CelebrationRain variant="money" count={count} />;
    case 'cele-orbs':
      return <CelebrationRain variant="orbs" count={count} />;
    case 'cele-chips':
    default:
      return <ChipRain count={count} />;
  }
}
