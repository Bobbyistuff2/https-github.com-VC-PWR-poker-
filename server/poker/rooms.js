const { Room } = require('./Room');

const rooms = new Map();
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode() {
  let code;
  do {
    code = Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function createRoom() {
  const code = generateCode();
  const room = new Room(code);
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

module.exports = { createRoom, getRoom, deleteRoomIfEmpty };
