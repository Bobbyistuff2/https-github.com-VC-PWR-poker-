import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL;

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(API_URL, { withCredentials: true, autoConnect: false });
  }
  return socket;
}
