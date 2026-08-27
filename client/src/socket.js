import { io } from 'socket.io-client';

// Empty when unset, so the socket connects to the current origin — used in
// production where Vercel proxies /socket.io through to the Render backend,
// keeping the session cookie first-party.
const API_URL = import.meta.env.VITE_API_URL || '';

let socket = null;

export function getSocket() {
  if (!socket) {
    // Passing '' as the uri (instead of omitting it) would make socket.io-client
    // try to connect to a literal empty host, so branch instead of always
    // calling io(API_URL, opts).
    socket = API_URL
      ? io(API_URL, { withCredentials: true, autoConnect: false })
      : io({ withCredentials: true, autoConnect: false });
  }
  return socket;
}
