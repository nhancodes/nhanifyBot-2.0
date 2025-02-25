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
                    if (data.queue.type) {
                        data.queue.type === 'nhanify' ? nhanifyQueue.remove() : chatQueue.remove();
                    }
                    console.log(JSON.stringify(chatQueue.getVideos()));
                    console.log(JSON.stringify(nhanifyQueue.getVideos()));
                case "playerReady":
                    let queue;
                    if (!chatQueue.isEmpty()) {
                        ws.send(JSON.stringify({ action: "play", queue: chatQueue.getQueue() }));
                    } else if (!nhanifyQueue.isEmpty()) {
                        ws.send(JSON.stringify({ action: "play", queue: nhanifyQueue.getQueue() }));
                    } else {
                        ws.send(JSON.stringify({ action: "emptyQueues", queue: null }))
                    }
                    console.log("QUEUE PASSED TO CLIENT", { queue });
                    break;

            }
        });
    });
    return wss.clients;
}