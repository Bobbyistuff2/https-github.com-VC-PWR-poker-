const db = require('../db');
const { createRoom, getRoom, deleteRoomIfEmpty } = require('./rooms');
const { decideBotAction } = require('./bot');

const userRoomMap = new Map();

function syncSeatChipsToDb(room) {
  for (const seat of room.occupiedSeats) {
    if (seat.isBot) continue;
    db.prepare('UPDATE users SET chips = ? WHERE id = ?').run(seat.chips, seat.userId);
  }
}

function broadcastRoomState(io, room) {
  const socketIds = io.sockets.adapter.rooms.get(room.code);
  if (!socketIds) return;
  for (const socketId of socketIds) {
    const target = io.sockets.sockets.get(socketId);
    const userId = target?.request.session?.userId;
    if (!userId) continue;
    target.emit('room:state', room.publicState(userId));
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

    if (liveRoom.stage === 'waiting') syncSeatChipsToDb(liveRoom);
    broadcastRoomState(io, liveRoom);
    maybeScheduleBotMove(io, liveRoom);
  }, 900 + Math.random() * 700);
}

function registerPokerHandlers(io, socket) {
  const userId = socket.request.session?.userId;

  socket.on('room:create', (_payload, callback) => {
    if (!userId) return callback?.({ error: 'Not signed in' });
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return callback?.({ error: 'Not signed in' });

    const room = createRoom();
    room.addPlayer({ id: user.id, name: user.name, picture: user.picture, chips: user.chips });
    userRoomMap.set(userId, room.code);
    socket.join(room.code);
    callback?.({ code: room.code });
    broadcastRoomState(io, room);
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
    if (room.stage === 'waiting') syncSeatChipsToDb(room);
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
    if (room.stage === 'waiting') syncSeatChipsToDb(room);
    broadcastRoomState(io, room);
    deleteRoomIfEmpty(code);
  });
}

module.exports = { registerPokerHandlers };
