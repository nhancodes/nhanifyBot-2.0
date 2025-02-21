import { WebSocketServer } from 'ws';
import { chatQueue } from '../youtube/chatQueue.js';

export function startWebSocketServer() {
    const wss = new WebSocketServer({ port: 8099 });

    wss.on('connection', function connection(ws) {
        ws.on('error', console.error);

        ws.on('message', function message(data) {
            console.log('received: %s', data);
        });
        if (!chatQueue.isEmpty()) {
            ws.send(JSON.stringify({ type: "chat", queue: chatQueue.getQueue() }));
        } else {
            ws.send(JSON.stringify({ type: "nhanify", queue: { title: "title", id: "sdfsdf" } }));
        }

    });

}