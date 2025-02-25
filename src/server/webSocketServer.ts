import { WebSocketServer, WebSocket } from 'ws';
import { Queue } from '../videoAPI/queue.js';
import { webServer } from './webServer.js';
import auth from '../auth.json' with {type: 'json'};
export function startWebSocketServer(chatQueue: Queue, nhanifyQueue: Queue) {
    const wss = new WebSocketServer({ server: webServer });
    console.log('WebSocketServer created.');
    let ircClient: WebSocket | null;
    wss.on('connection', function connection(ws) {
        ws.on('error', console.error);
        ws.on('message', function message(message) {
            const data = JSON.parse(message.toString());
            console.log(`message recieved from client:  ${JSON.stringify(data)}`);
            if (ircClient) {
                switch (data.action) {
                    case "finished":
                        if (data.queue.type) {
                            data.queue.type === 'nhanify' ? nhanifyQueue.remove() : chatQueue.remove();
                        }
                        console.log(JSON.stringify(chatQueue.getVideos()));
                        console.log(JSON.stringify(nhanifyQueue.getVideos()));
                    case "ready":
                        let queue;
                        if (!chatQueue.isEmpty()) {
                            ws.send(JSON.stringify({ action: "play", queue: chatQueue.getQueue() }));
                        } else if (!nhanifyQueue.isEmpty()) {
                            ws.send(JSON.stringify({ action: "play", queue: nhanifyQueue.getQueue() }));
                        } else {
                            ws.send(JSON.stringify({ action: "emptyQueues", queue: null }))
                        }
                        break;
                    case "pause":
                        console.log("IN PAUSE ");
                        console.log({ ircClient });
                    case "resume":
                        //included chatter in properties to send over to the client from the irc to include as port of irc message
                        console.log("IN RESUME ");
                        ircClient.send(`PRIVMSG #${auth.TWITCH_CHANNEL} : Player ${data.action}d.`);
                }
            }
        });
    });
    return {
        webSocketServerClients: wss.clients,
        setIrcClient: (client: WebSocket) => {
            ircClient = client;
        }
    }
}