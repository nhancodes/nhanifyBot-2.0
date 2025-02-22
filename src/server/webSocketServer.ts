import { WebSocketServer } from 'ws';
import { Queue } from '../videoAPI/queue.js';
import { webServer } from './webServer.js';

export function startWebSocketServer(chatQueue: Queue, nhanifyQueue: Queue) {
    const wss = new WebSocketServer({ server: webServer });
    console.log('WebSocketServer created.');
    wss.on('connection', function connection(ws) {
        ws.on('error', console.error);

        ws.on('message', function message(data) {
            console.log('received:', data.toString());
        });
        if (!chatQueue.isEmpty()) {
            ws.send(JSON.stringify(chatQueue.getQueue()));
        } else {
            ws.send(JSON.stringify(nhanifyQueue));
        }

    });

}