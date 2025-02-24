import { WebSocketServer } from 'ws';
import { Queue } from '../videoAPI/queue.js';
import { webServer } from './webServer.js';

export function startWebSocketServer(chatQueue: Queue, nhanifyQueue: Queue) {
    const wss = new WebSocketServer({ server: webServer });
    console.log('WebSocketServer created.');
    wss.on('connection', function connection(ws) {
        ws.on('error', console.error);
        ws.on('message', function message(message) {
            const data = JSON.parse(message.toString());
            console.log(`message recieved from client:  ${JSON.stringify(data)}`);
            switch (data.action) {
                case "playerFinished":
                    data.queue.type === 'nhanify' ? nhanifyQueue.remove() : chatQueue.remove();
                case "playerReady":
                    const queue = !chatQueue.isEmpty() ? chatQueue.getQueue() : nhanifyQueue.getQueue();
                    ws.send(JSON.stringify({ action: "play", queue }));
                    break;
            }
        });

    });
    return wss.clients;
}