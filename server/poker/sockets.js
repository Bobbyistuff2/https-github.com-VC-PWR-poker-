const db = require('../db');
const { createRoom, getRoom, deleteRoomIfEmpty, listOpenTournaments } = require('./rooms');
const { decideBotAction } = require('./bot');
const achievements = require('../achievements');
const ranks = require('../ranks');

const ROOM_TYPES = new Set(['tournament', 'quick', 'private']);

// Real players only get credit for hands they were actually dealt into —
// bots and spectators (joined mid-hand, inHand still false) are skipped.
function checkDealtAchievements(room) {
  const unlocked = [];
  for (const seat of room.occupiedSeats) {
    if (seat.isBot || !seat.inHand) continue;
    for (const a of achievements.checkHandDealt(seat.userId, seat.holeCards)) {
      unlocked.push({ userId: seat.userId, achievement: a });
    }
  }
  return unlocked;
}

// Call once, right after a hand resolves (room.stage newly 'waiting' with a
// fresh lastResult) — checks win-streaks, specific-hand wins, and lifetime
// win milestones for every real player who was dealt into that hand.
function checkResultAchievements(room) {
  if (!room.lastResult) return [];
  const winners = new Map(room.lastResult.payouts.filter((p) => p.amount > 0).map((p) => [p.seatIndex, p]));
  const unlocked = [];
  for (const seat of room.occupiedSeats) {
    if (seat.isBot || !seat.inHand) continue;
    const payout = winners.get(seat.seatIndex);
    const list = achievements.checkHandResult(seat.userId, {
      won: !!payout,
      handName: payout?.hand,
      isRoyal: !!payout?.royalFlush,
      wasAllIn: seat.allIn,
      amountWon: payout?.amount || 0,
    });
    for (const a of list) {
      // achievements.unlock() already applied the reward in the DB — mirror
      // it onto the in-memory seat too so the client's next broadcast (and
      // any later syncSeatChipsToDb call) reflect the same balance.
      seat.chips += a.reward;
      unlocked.push({ userId: seat.userId, achievement: a });
    }
  }
  return unlocked;
}

function notifyAchievements(io, room, unlockedList) {
  if (!unlockedList.length) return;
  const socketIds = io.sockets.adapter.rooms.get(room.code);
  if (!socketIds) return;
  for (const socketId of socketIds) {
    const target = io.sockets.sockets.get(socketId);
    const uid = target?.request.session?.userId;
    if (!uid) continue;
    const mine = unlockedList.filter((u) => u.userId === uid).map((u) => u.achievement);
    if (mine.length) target.emit('achievement:unlocked', mine);
  }
}

const userRoomMap = new Map();

function syncSeatChipsToDb(room) {
  for (const seat of room.occupiedSeats) {
    if (seat.isBot) continue;
    db.prepare('UPDATE users SET chips = ? WHERE id = ?').run(seat.chips, seat.userId);
  }
}

// Ranks are always shown, at the table as well as the lobby — computed once
// per broadcast (not once per viewer) from each real seat's lifetime XP in
// the DB. Bots don't get one.
function computeSeatRanks(room) {
  const map = new Map();
  for (const seat of room.occupiedSeats) {
    if (seat.isBot) continue;
    const row = db.prepare('SELECT xp FROM users WHERE id = ?').get(seat.userId);
    map.set(seat.seatIndex, ranks.getRank({ xp: row?.xp || 0 }));
  }
  return map;
}

function broadcastRoomState(io, room) {
  const socketIds = io.sockets.adapter.rooms.get(room.code);
  if (!socketIds) return;
  const seatRanks = computeSeatRanks(room);
  for (const socketId of socketIds) {
    const target = io.sockets.sockets.get(socketId);
    const userId = target?.request.session?.userId;
    if (!userId) continue;
    const state = room.publicState(userId);
    state.seats = state.seats.map((seat) => (seat ? { ...seat, rank: seatRanks.get(seat.seatIndex) || null } : seat));
    target.emit('room:state', state);
  }
}

// If it's now a bot's turn, let it "think" for a bit and then act on its own,
// re-broadcasting the result. Recurses so a chain of bot turns plays itself out.
function maybeScheduleBotMove(io, room) {
  if (room.stage === 'waiting') return;
  const seat = room.seats[room.turnSeat];
  if (!seat || !seat.isBot) return;

  const roomCode = room.code;
  setTimeout(() => {
    const liveRoom = getRoom(roomCode);
    if (!liveRoom || liveRoom.stage === 'waiting') return;
    const liveSeat = liveRoom.seats[liveRoom.turnSeat];
    if (!liveSeat || !liveSeat.isBot) return;

    try {
      const decision = decideBotAction(liveRoom, liveSeat);
      liveRoom.handleAction(liveSeat.userId, decision.action, decision.amount);
    } catch (err) {
      console.error('Bot action failed:', err.message);
      return;
    }

    if (liveRoom.stage === 'waiting') {
      syncSeatChipsToDb(liveRoom);
      notifyAchievements(io, liveRoom, checkResultAchievements(liveRoom));
    }
    broadcastRoomState(io, liveRoom);
    maybeScheduleBotMove(io, liveRoom);
  }, 900 + Math.random() * 700);
}

function registerPokerHandlers(io, socket) {
  const userId = socket.request.session?.userId;

  socket.on('room:create', (payload, callback) => {
    if (!userId) return callback?.({ error: 'Not signed in' });
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return callback?.({ error: 'Not signed in' });

    const type = ROOM_TYPES.has(payload?.type) ? payload.type : 'private';
    const room = createRoom(type);
    room.addPlayer({ id: user.id, name: user.name, picture: user.picture, chips: user.chips });
    userRoomMap.set(userId, room.code);
    socket.join(room.code);

    if (type === 'quick') {
      // Quick Games are always just you vs. the AI — cap at 2 bots
      // regardless of what the client sends, then jump straight into a hand.
      const botCount = Math.max(1, Math.min(2, parseInt(payload?.botCount, 10) || 1));
      for (let i = 0; i < botCount; i += 1) {
        try {
          room.addBot();
        } catch (err) {
          break;
        }
      }
      if (room.canStartHand()) {
        try {
          room.startHand();
          notifyAchievements(io, room, checkDealtAchievements(room));
        } catch (err) {
          // If somehow not startable, leave it in "waiting" — the player
          // still lands at the table and can hit Start Hand themselves.
        }
      }
    }

    callback?.({ code: room.code });
    broadcastRoomState(io, room);
    if (type === 'quick') maybeScheduleBotMove(io, room);
  });

  socket.on('room:listTournaments', (_payload, callback) => {
    callback?.(listOpenTournaments());
  });

  socket.on('room:join', (payload, callback) => {
    if (!userId) return callback?.({ error: 'Not signed in' });
    const room = getRoom(payload?.code);
    if (!room) return callback?.({ error: 'Room not found' });

    const existingSeat = room.findSeatByUserId(userId);
    if (!existingSeat) {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!user) return callback?.({ error: 'Not signed in' });
      try {
        room.addPlayer({ id: user.id, name: user.name, picture: user.picture, chips: user.chips });
      } catch (err) {
        return callback?.({ error: err.message });
      }
    }

    userRoomMap.set(userId, room.code);
    socket.join(room.code);
    callback?.({ code: room.code });
    broadcastRoomState(io, room);
  });

  socket.on('room:leave', (_payload, callback) => {
    const code = userRoomMap.get(userId);
    const room = code && getRoom(code);
    if (!room) return callback?.();
    if (room.stage !== 'waiting') return callback?.({ error: 'Cannot leave mid-hand' });

    const chips = room.removePlayer(userId);
    if (chips != null) db.prepare('UPDATE users SET chips = ? WHERE id = ?').run(chips, userId);
    userRoomMap.delete(userId);
    socket.leave(code);
    callback?.();
    broadcastRoomState(io, room);
    deleteRoomIfEmpty(code);
  });

  socket.on('room:addBot', (_payload, callback) => {
    const room = getRoom(userRoomMap.get(userId));
    if (!room) return callback?.({ error: 'Not in a room' });
    if (room.stage !== 'waiting') return callback?.({ error: 'Cannot add a bot mid-hand' });
    try {
      room.addBot();
    } catch (err) {
      return callback?.({ error: err.message });
    }
    callback?.();
    broadcastRoomState(io, room);
  });

  socket.on('room:removeBot', (_payload, callback) => {
    const room = getRoom(userRoomMap.get(userId));
    if (!room) return callback?.({ error: 'Not in a room' });
    if (room.stage !== 'waiting') return callback?.({ error: 'Cannot remove a bot mid-hand' });
    room.removeBot();
    callback?.();
    broadcastRoomState(io, room);
  });

  socket.on('room:start', (_payload, callback) => {
    const room = getRoom(userRoomMap.get(userId));
    if (!room) return callback?.({ error: 'Not in a room' });
    try {
      room.startHand();
    } catch (err) {
      return callback?.({ error: err.message });
    }
    notifyAchievements(io, room, checkDealtAchievements(room));
    callback?.();
    broadcastRoomState(io, room);
    maybeScheduleBotMove(io, room);
  });

  socket.on('room:action', (payload, callback) => {
    const room = getRoom(userRoomMap.get(userId));
    if (!room) return callback?.({ error: 'Not in a room' });
    try {
      room.handleAction(userId, payload?.action, payload?.amount);
    } catch (err) {
      return callback?.({ error: err.message });
    }
    if (room.stage === 'waiting') {
      syncSeatChipsToDb(room);
      notifyAchievements(io, room, checkResultAchievements(room));
    }
    callback?.();
    broadcastRoomState(io, room);
    maybeScheduleBotMove(io, room);
  });

  socket.on('disconnect', () => {
    const code = userRoomMap.get(userId);
    const room = code && getRoom(code);
    if (!room) return;
    room.foldOnDisconnect(userId);
    userRoomMap.delete(userId);
    if (room.stage === 'waiting') {
      syncSeatChipsToDb(room);
      notifyAchievements(io, room, checkResultAchievements(room));
    }
    broadcastRoomState(io, room);
    deleteRoomIfEmpty(code);
  });
}

module.exports = { registerPokerHandlers };
