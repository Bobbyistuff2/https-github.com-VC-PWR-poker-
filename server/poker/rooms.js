const { Room, MAX_SEATS } = require('./Room');

const rooms = new Map();
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode() {
  let code;
  do {
    code = Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function createRoom(type = 'private') {
  const code = generateCode();
  const room = new Room(code, type);
  rooms.set(code, room);
  return room;
}

function getRoom(code) {
  return rooms.get((code || '').toUpperCase()) || null;
}

function deleteRoomIfEmpty(code) {
  const room = rooms.get(code);
  // A room with only a bot left (no real players) is as good as empty —
  // otherwise it would never get cleaned up once everyone leaves.
  if (room && !room.occupiedSeats.some((s) => !s.isBot)) rooms.delete(code);
}

// Tournaments are the only room type meant to be publicly discoverable —
// cash games are a stub for now and quick games are private, bot-filled
// tables. Anyone can see and join an open (non-full) tournament table.
function listOpenTournaments() {
  const list = [];
  for (const room of rooms.values()) {
    if (room.type !== 'tournament') continue;
    if (room.occupiedSeats.length >= MAX_SEATS) continue;
    const host = room.occupiedSeats.find((s) => !s.isBot) || room.occupiedSeats[0];
    list.push({
      code: room.code,
      hostName: host?.name || 'Player',
      playerCount: room.occupiedSeats.length,
      maxSeats: MAX_SEATS,
    });
  }
  return list;
}

module.exports = { createRoom, getRoom, deleteRoomIfEmpty, listOpenTournaments };
