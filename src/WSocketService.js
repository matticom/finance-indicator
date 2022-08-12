import { io } from 'socket.io-client';

const socket = io('http://localhost:8100', {
   path: '/notification/',
   timeout: 300 * 1000,
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

export function setListenerOnDisconnect(handler) {
   console.error('disconnected!!!!!!!!!');
   socket.on('disconnect', handler);
}

export function setListenerOnConnect(handler) {
   socket.on('connect', handler);
}

export function removeListener(type) {
   socket.off(type);
}
