const crypto = require('crypto');
const { createDeck, shuffle } = require('./deck');
const { evaluateBest, compareScores } = require('./handEval');

const MAX_SEATS = 4;
const MIN_BET = 1;
const MAX_BOTS = 3;

// Flavorful stand-ins for "Bot 1" / "Bot 2" so AI opponents feel a bit more
// like players. Falls back to reuse only if every name is already taken at
// the table (never happens in practice — MAX_BOTS is well under the pool).
const BOT_NAMES = [
  'Ace', 'Duke', 'Slick', 'Maverick', 'Reno', 'Jett', 'Diesel', 'Foxy',
  'Cassius', 'Wolf', 'Blaze', 'Duchess', 'Knox', 'Vegas', 'Cash', 'Shark',
];

class Room {
  constructor(code, type = 'private') {
    this.code = code;
    this.type = type;
    this.seats = new Array(MAX_SEATS).fill(null);
    this.stage = 'waiting';
    this.deck = [];
    this.communityCards = [];
    this.pot = 0;
    this.currentBet = 0;
    this.minRaise = MIN_BET;
    this.dealerSeat = -1;
    this.turnSeat = -1;
    this.toAct = new Set();
    this.lastResult = null;
    this.lastAction = null;
    // Monotonic counter stamped onto every lastAction — the client compares
    // this instead of object identity, since a broadcast round-trips
    // through JSON and never preserves object references, so "is this the
    // same action I already toasted" can't be answered by === alone.
    this._actionSeq = 0;
    this.handNumber = 0;
    // Rolling log of recently completed hands, newest first — capped below
    // so it stays cheap to keep in memory for the life of the room. Not
    // persisted anywhere; it resets when the room does, same as everything
    // else about a live table.
    this.handHistory = [];
  }

  get occupiedSeats() {
    return this.seats.filter(Boolean);
  }

  findSeatByUserId(userId) {
    return this.seats.find((s) => s && s.userId === userId) || null;
  }

  addPlayer(user, { isBot = false } = {}) {
    if (this.findSeatByUserId(user.id)) return;
    const emptyIndex = this.seats.findIndex((s) => s === null);
    if (emptyIndex === -1) throw new Error('Table is full');
    this.seats[emptyIndex] = {
      seatIndex: emptyIndex,
      userId: user.id,
      name: user.name,
      picture: user.picture,
      chips: user.chips,
      holeCards: [],
      betThisRound: 0,
      committedThisHand: 0,
      folded: false,
      allIn: false,
      inHand: false,
      isBot,
    };
  }

  hasBot() {
    return this.occupiedSeats.some((s) => s.isBot);
  }

  botSeats() {
    return this.occupiedSeats.filter((s) => s.isBot);
  }

  addBot() {
    const bots = this.botSeats();
    if (bots.length >= MAX_BOTS) throw new Error(`This table already has the max of ${MAX_BOTS} bots`);
    if (this.occupiedSeats.length >= MAX_SEATS) throw new Error('Table is full');

    const usedNames = new Set(this.occupiedSeats.map((s) => s.name));
    const available = BOT_NAMES.filter((n) => !usedNames.has(n));
    const pool = available.length > 0 ? available : BOT_NAMES;
    const name = pool[Math.floor(Math.random() * pool.length)];

    // Each bot needs a distinct userId — addPlayer no-ops if one already
    // exists for the given id, which a shared fixed id would trigger.
    this.addPlayer(
      { id: `bot-${crypto.randomUUID()}`, name, picture: null, chips: 1000 },
      { isBot: true }
    );
  }

  // Only safe to call while stage === 'waiting' (pot is empty, no in-progress
  // betting to account for). Use foldOnDisconnect for mid-hand departures.
  removePlayer(userId) {
    const seat = this.findSeatByUserId(userId);
    if (!seat) return null;
    const chips = seat.chips;
    this.seats[seat.seatIndex] = null;
    return chips;
  }

  removeBot() {
    const bots = this.botSeats();
    if (bots.length === 0) return;
    // Bots fill seats in increasing seat order, so the highest seat index
    // among them is the most recently added — remove that one for a clean
    // LIFO feel when the button is clicked repeatedly.
    const target = bots.reduce((last, s) => (s.seatIndex > last.seatIndex ? s : last));
    this.seats[target.seatIndex] = null;
  }

  foldOnDisconnect(userId) {
    const seat = this.findSeatByUserId(userId);
    if (!seat) return;
    if (this.stage === 'waiting') {
      this.seats[seat.seatIndex] = null;
      return;
    }
    if (!seat.inHand || seat.folded) {
      seat.leaving = true;
      return;
    }
    const wasTurn = this.turnSeat === seat.seatIndex;
    seat.folded = true;
    seat.leaving = true;
    this.toAct.delete(seat.seatIndex);
    if (wasTurn) this._advanceAfterAction();
    else if (this.activeSeatIndices().length <= 1) this._resolveShowdown(true);
  }

  _sweepLeavingSeats() {
    for (let i = 0; i < this.seats.length; i++) {
      if (this.seats[i]?.leaving) this.seats[i] = null;
    }
  }

  activeSeatIndices() {
    return this.seats
      .map((s, i) => (s && s.inHand && !s.folded ? i : -1))
      .filter((i) => i !== -1);
  }

  contendingSeatIndices() {
    return this.seats
      .map((s, i) => (s && s.inHand && !s.folded && !s.allIn ? i : -1))
      .filter((i) => i !== -1);
  }

  canStartHand() {
    return this.stage === 'waiting' && this.occupiedSeats.filter((s) => s.chips > 0).length >= 2;
  }

  startHand() {
    if (!this.canStartHand()) throw new Error('Cannot start hand');

    const eligible = this.seats
      .map((s, i) => (s && s.chips > 0 ? i : -1))
      .filter((i) => i !== -1);

    this.handNumber += 1;
    this.deck = shuffle(createDeck());
    this.communityCards = [];
    this.pot = 0;
    this.lastResult = null;
    // Belt-and-suspenders alongside the seq check in handleAction — a fresh
    // hand shouldn't still be showing an action toast for something that
    // happened last hand, even for the brief window before anyone's acted.
    this.lastAction = null;

    for (const seat of this.occupiedSeats) {
      seat.holeCards = [];
      seat.betThisRound = 0;
      seat.committedThisHand = 0;
      seat.folded = false;
      seat.allIn = false;
      seat.inHand = eligible.includes(seat.seatIndex);
    }

    this.dealerSeat = nextIndex(this.dealerSeat, eligible);

    for (const i of eligible) {
      const seat = this.seats[i];
      seat.holeCards = [this.deck.pop(), this.deck.pop()];
    }

    this.currentBet = 0;
    this.minRaise = MIN_BET;
    this.stage = 'preflop';
    this.toAct = new Set(this.activeSeatIndices());
    this.turnSeat = nextIndex(this.dealerSeat, this.activeSeatIndices());
    this._skipIfNotToAct();
  }

  handleAction(userId, action, amount = 0) {
    const seat = this.findSeatByUserId(userId);
    if (!seat) throw new Error('Not seated');
    if (this.turnSeat !== seat.seatIndex) throw new Error('Not your turn');
    if (!seat.inHand || seat.folded) throw new Error('Not in hand');

    const currentBetBefore = this.currentBet;
    const betBefore = seat.betThisRound;

    if (action === 'fold') this._fold(seat);
    else if (action === 'check') this._checkOrCall(seat);
    else if (action === 'call') this._checkOrCall(seat);
    else if (action === 'raise') this._betOrRaise(seat, amount);
    else if (action === 'allin') this._betOrRaise(seat, seat.betThisRound + seat.chips);
    else throw new Error('Unknown action');

    // A short-lived label describing what just happened, so clients can show
    // a transient "Checked" / "Bet 20" / "Folded" toast near the seat.
    this._actionSeq += 1;
    this.lastAction = { ...this._describeAction(seat, action, currentBetBefore, betBefore), seq: this._actionSeq };

    this.toAct.delete(seat.seatIndex);
    this._advanceAfterAction();
  }

  _describeAction(seat, action, currentBetBefore, betBefore) {
    const seatIndex = seat.seatIndex;
    // Chips this action actually pushed into the pot — 0 for a fold/check.
    // Clients use this to animate chips flying from the seat to the pot
    // without having to parse the amount back out of `label`.
    const contributed = seat.betThisRound - betBefore;
    if (action === 'fold') return { seatIndex, label: 'Folded', contributed: 0 };
    if (seat.allIn) return { seatIndex, label: 'All In!', contributed };

    if (action === 'check' || action === 'call') {
      return { seatIndex, label: contributed > 0 ? `Called ${contributed}` : 'Checked', contributed };
    }

    // raise/allin actions both land here via _betOrRaise
    return {
      seatIndex,
      label: currentBetBefore === 0 ? `Bet ${seat.betThisRound}` : `Raised to ${seat.betThisRound}`,
      contributed,
    };
  }

  _fold(seat) {
    seat.folded = true;
  }

  _checkOrCall(seat) {
    const toCall = Math.min(this.currentBet - seat.betThisRound, seat.chips);
    seat.chips -= toCall;
    seat.betThisRound += toCall;
    seat.committedThisHand += toCall;
    this.pot += toCall;
    if (seat.chips === 0) seat.allIn = true;
  }

  _betOrRaise(seat, toAmount) {
    const target = Math.min(toAmount, seat.betThisRound + seat.chips);
    const delta = target - seat.betThisRound;
    if (delta <= 0) throw new Error('Invalid raise amount');
    const isFullRaise = target - this.currentBet >= this.minRaise;
    if (target < seat.betThisRound + seat.chips && !isFullRaise) {
      throw new Error('Raise too small');
    }

    seat.chips -= delta;
    seat.betThisRound = target;
    seat.committedThisHand += delta;
    this.pot += delta;
    if (seat.chips === 0) seat.allIn = true;

    if (target > this.currentBet) {
      const raiseSize = target - this.currentBet;
      this.currentBet = target;
      if (raiseSize > this.minRaise) this.minRaise = raiseSize;
      this.toAct = new Set(this.contendingSeatIndices().filter((i) => i !== seat.seatIndex));
    }
  }

  _advanceAfterAction() {
    const contenders = this.activeSeatIndices();
    if (contenders.length <= 1) {
      this._resolveShowdown(true);
      return;
    }

    if (this.toAct.size === 0) {
      this._advanceStage();
      return;
    }

    this.turnSeat = nextIndex(this.turnSeat, this.activeSeatIndices());
    this._skipIfNotToAct();
  }

  _skipIfNotToAct() {
    if (this.contendingSeatIndices().length === 0) {
      this._advanceStage();
      return;
    }
    let guard = 0;
    while (!this.toAct.has(this.turnSeat) && guard < MAX_SEATS + 1) {
      if (this.toAct.size === 0) {
        this._advanceStage();
        return;
      }
      this.turnSeat = nextIndex(this.turnSeat, this.activeSeatIndices());
      guard += 1;
    }
  }

  _advanceStage() {
    for (const seat of this.occupiedSeats) seat.betThisRound = 0;
    this.currentBet = 0;
    this.minRaise = MIN_BET;

    if (this.stage === 'preflop') {
      this.deck.pop();
      this.communityCards.push(this.deck.pop(), this.deck.pop(), this.deck.pop());
      this.stage = 'flop';
    } else if (this.stage === 'flop') {
      this.deck.pop();
      this.communityCards.push(this.deck.pop());
      this.stage = 'turn';
    } else if (this.stage === 'turn') {
      this.deck.pop();
      this.communityCards.push(this.deck.pop());
      this.stage = 'river';
    } else if (this.stage === 'river') {
      this._resolveShowdown(false);
      return;
    }

    this.toAct = new Set(this.contendingSeatIndices());
    if (this.toAct.size === 0) {
      this._advanceStage();
      return;
    }
    this.turnSeat = nextIndex(this.dealerSeat, this.activeSeatIndices());
    this._skipIfNotToAct();
  }

  _endHandNoContest() {
    this.stage = 'waiting';
    this.pot = 0;
    this.turnSeat = -1;
    this.toAct = new Set();
    this._sweepLeavingSeats();
  }

  _resolveShowdown(singleWinnerOnly) {
    for (const seat of this.occupiedSeats) seat.betThisRound = 0;

    const contenders = this.activeSeatIndices().map((i) => this.seats[i]);
    const payouts = [];

    if (singleWinnerOnly && contenders.length === 1) {
      const winner = contenders[0];
      winner.chips += this.pot;
      // `amount` is the whole pot (including the winner's own money coming
      // back to them); `profit` is what they actually gained — the pot
      // minus what they themselves put into it this hand. Display should
      // use profit; amount stays around for anything that cares about the
      // literal chip movement (achievements, stats).
      payouts.push({
        seatIndex: winner.seatIndex,
        amount: this.pot,
        profit: this.pot - winner.committedThisHand,
        hand: null,
      });
    } else {
      // Winner takes the entire pot — no side pots. An all-in player who
      // covered less than everyone else's bet is still evaluated against
      // the whole pot rather than a layered slice of it: simpler to follow
      // at the table, and it means a hand result never shows two different
      // hand types each "winning" their own separate amount — only one
      // hand type wins, for the full pot, unless it's an exact tie.
      const scored = contenders.map((seat) => ({
        seat,
        score: evaluateBest([...seat.holeCards, ...this.communityCards]),
      }));
      scored.sort((a, b) => compareScores(b.score, a.score));
      const best = scored[0].score;
      const winners = scored.filter((s) => compareScores(s.score, best) === 0);
      const share = Math.floor(this.pot / winners.length);
      let remainder = this.pot - share * winners.length;
      for (const w of winners) {
        const amount = share + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder -= 1;
        w.seat.chips += amount;
        // rank 9 with an Ace-high tiebreak is specifically a Royal Flush —
        // handEval only names it "Straight Flush", so callers that care
        // about the royal case (achievements) need this flagged here.
        const isRoyal = w.score.rank === 9 && w.score.tiebreak[0] === 14;
        payouts.push({
          seatIndex: w.seat.seatIndex,
          amount,
          profit: amount - w.seat.committedThisHand,
          hand: w.score.name,
          royalFlush: isRoyal,
        });
      }
    }

    const revealed =
      singleWinnerOnly && contenders.length === 1
        ? []
        : contenders.map((s) => ({ seatIndex: s.seatIndex, holeCards: s.holeCards }));

    this.lastResult = { payouts, revealed };

    this.handHistory.unshift({
      handNumber: this.handNumber,
      pot: this.pot,
      communityCards: [...this.communityCards],
      payouts: payouts.map((p) => ({
        seatIndex: p.seatIndex,
        name: this.seats[p.seatIndex]?.name || 'Player',
        amount: p.amount,
        profit: p.profit,
        hand: p.hand,
      })),
      at: Date.now(),
    });
    if (this.handHistory.length > 10) this.handHistory.length = 10;

    this.stage = 'waiting';
    this.pot = 0;
    this.turnSeat = -1;
    this.toAct = new Set();
    this._sweepLeavingSeats();
  }

  publicState(viewerUserId) {
    return {
      code: this.code,
      type: this.type,
      stage: this.stage,
      communityCards: this.communityCards,
      pot: this.pot,
      currentBet: this.currentBet,
      minRaise: this.minRaise,
      dealerSeat: this.dealerSeat,
      turnSeat: this.turnSeat,
      handNumber: this.handNumber,
      lastResult: this.lastResult,
      lastAction: this.lastAction,
      handHistory: this.handHistory,
      canStart: this.canStartHand(),
      seats: this.seats.map((seat) => {
        if (!seat) return null;
        const isViewer = seat.userId === viewerUserId;
        const revealedEntry = this.lastResult?.revealed.find(
          (r) => r.seatIndex === seat.seatIndex
        );
        const showCards = isViewer ? seat.holeCards : revealedEntry ? revealedEntry.holeCards : [];
        return {
          seatIndex: seat.seatIndex,
          userId: seat.userId,
          name: seat.name,
          picture: seat.picture,
          chips: seat.chips,
          betThisRound: seat.betThisRound,
          folded: seat.folded,
          allIn: seat.allIn,
          inHand: seat.inHand,
          holeCards: showCards,
          hasCards: seat.holeCards.length > 0 && seat.inHand,
          isBot: !!seat.isBot,
        };
      }),
    };
  }
}

function nextIndex(from, pool) {
  if (pool.length === 0) return -1;
  const sorted = [...pool].sort((a, b) => a - b);
  if (from === -1) return sorted[0];
  const idx = sorted.findIndex((i) => i > from);
  return idx === -1 ? sorted[0] : sorted[idx];
}

module.exports = { Room, MAX_SEATS };
