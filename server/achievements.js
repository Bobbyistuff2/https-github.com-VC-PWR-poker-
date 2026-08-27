const db = require('./db');

// Starter set of achievements — chip rewards granted once, the first time
// each one is earned. Streak/lifetime-win counters live on the users table
// (win_streak, hands_won); which achievement has already been unlocked lives
// in the achievements table.
const ACHIEVEMENTS = [
  { id: 'first_win', title: 'First Blood', description: 'Win your first hand.', reward: 30 },
  { id: 'streak_2', title: 'Hot Streak', description: 'Win 2 hands in a row.', reward: 50 },
  { id: 'streak_3', title: 'On Fire', description: 'Win 3 hands in a row.', reward: 100 },
  { id: 'pocket_sixes', title: 'Pocket Sixes', description: 'Get dealt a pair of sixes.', reward: 40 },
  { id: 'flush_win', title: 'Flush Fortune', description: 'Win a hand with a Flush.', reward: 60 },
  { id: 'full_house_win', title: 'Full House Fortune', description: 'Win a hand with a Full House.', reward: 80 },
  { id: 'quads_win', title: 'Quad Squad', description: 'Win a hand with Four of a Kind.', reward: 150 },
  { id: 'royal_flush_win', title: 'Royal Treatment', description: 'Win a hand with a Royal Flush.', reward: 300 },
  { id: 'all_in_win', title: 'All-In Winner', description: 'Win a pot after going all-in.', reward: 50 },
  { id: 'grinder_10', title: 'Grinder', description: 'Win 10 hands total.', reward: 100 },
];

const BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

function getUnlockedIds(userId) {
  return new Set(
    db
      .prepare('SELECT achievement_id FROM achievements WHERE user_id = ?')
      .all(userId)
      .map((r) => r.achievement_id)
  );
}

// Grants an achievement (and its chip reward) if the user doesn't already
// have it. Returns the achievement def, or null if already unlocked/unknown.
function unlock(userId, achievementId) {
  const def = BY_ID.get(achievementId);
  if (!def) return null;
  const already = db
    .prepare('SELECT 1 FROM achievements WHERE user_id = ? AND achievement_id = ?')
    .get(userId, achievementId);
  if (already) return null;
  db.prepare('INSERT INTO achievements (user_id, achievement_id) VALUES (?, ?)').run(userId, achievementId);
  db.prepare('UPDATE users SET chips = chips + ? WHERE id = ?').run(def.reward, userId);
  return def;
}

// Call right after hole cards are dealt to a real (non-bot) player.
function checkHandDealt(userId, holeCards) {
  const unlocked = [];
  if (holeCards.length === 2 && holeCards[0].rank === '6' && holeCards[1].rank === '6') {
    const a = unlock(userId, 'pocket_sixes');
    if (a) unlocked.push(a);
  }
  return unlocked;
}

// Call once per finished hand for each real player who was dealt into it.
function checkHandResult(userId, { won, handName, isRoyal, wasAllIn }) {
  const unlocked = [];
  const push = (a) => {
    if (a) unlocked.push(a);
  };
  const user = db.prepare('SELECT win_streak, hands_won FROM users WHERE id = ?').get(userId);
  if (!user) return unlocked;

  if (!won) {
    if (user.win_streak !== 0) db.prepare('UPDATE users SET win_streak = 0 WHERE id = ?').run(userId);
    return unlocked;
  }

  const newStreak = user.win_streak + 1;
  const newHandsWon = user.hands_won + 1;
  db.prepare('UPDATE users SET win_streak = ?, hands_won = ? WHERE id = ?').run(newStreak, newHandsWon, userId);

  if (newHandsWon === 1) push(unlock(userId, 'first_win'));
  if (newStreak === 2) push(unlock(userId, 'streak_2'));
  if (newStreak === 3) push(unlock(userId, 'streak_3'));
  if (newHandsWon >= 10) push(unlock(userId, 'grinder_10'));
  if (wasAllIn) push(unlock(userId, 'all_in_win'));
  if (isRoyal) push(unlock(userId, 'royal_flush_win'));
  else if (handName === 'Four of a Kind') push(unlock(userId, 'quads_win'));
  else if (handName === 'Full House') push(unlock(userId, 'full_house_win'));
  else if (handName === 'Flush') push(unlock(userId, 'flush_win'));

  return unlocked;
}

function listForUser(userId) {
  const unlockedIds = getUnlockedIds(userId);
  return ACHIEVEMENTS.map((a) => ({ ...a, unlocked: unlockedIds.has(a.id) }));
}

module.exports = { ACHIEVEMENTS, unlock, checkHandDealt, checkHandResult, listForUser };
