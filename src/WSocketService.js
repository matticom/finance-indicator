import { io } from 'socket.io-client';

const socket = io('http://localhost:8100', {
   path: '/notification/',
});

socket.on('connect', () => {
   console.log('connected: ', socket.connected);
});

socket.on('disconnect', () => {
   console.log('disconnect: ', !socket.connected);
});

export function sendMsg(type, msg) {
   socket.emit(type, msg);
}

export function setListener(type, handler) {
   socket.on(type, handler);
}

export function removeListener(type) {
   socket.off(type);
}
