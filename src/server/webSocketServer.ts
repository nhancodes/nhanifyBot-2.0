import { WebSocketServer, WebSocket } from 'ws';
import { Queue } from '../videoAPI/queue.js';
import { webServer } from './webServer.js';
import auth from '../auth.json' with {type: 'json'};
import { Nhanify } from '../videoAPI/types.js';
import { Rewards } from '../twitch/api/reward.js';
import { playerReady } from '../commands.js';
export function startWebSocketServer(chatQueue: Queue, nhanifyQueue: Queue, nhanify: Nhanify, rewards: Rewards) {
    const wss = new WebSocketServer({ server: webServer });
    console.log('WebSocketServer created.');
    let ircClient: WebSocket | null;
    wss.on('connection', function connection(ws) {
        ws.on('error', console.error);
        ws.on('message', async function message(message) {
            const data = JSON.parse(message.toString());
            console.log(`message recieved from client:  ${JSON.stringify(data)}`);
            if (ircClient) {
                switch (data.action) {
                    case "finished":
                        // if playing on is null we do not remove
                        if (Queue.getPlayingOn() === 'nhanify') nhanifyQueue.remove();
                        if (Queue.getPlayingOn() === 'chat') chatQueue.remove();
                    case "ready":
                        playerReady(ws, chatQueue, nhanifyQueue,nhanify);
                        break;
                    case "pause":
                    case "resume":
                        ircClient.send(`PRIVMSG #${auth.TWITCH_CHANNEL} : Player ${data.action}d.`);
                        break;
                    case "skipSong":
                        ircClient.send(`PRIVMSG #${auth.TWITCH_CHANNEL} : Skipped song.`);
                        break;
                    case "skipPlaylist":
                        ircClient.send(`PRIVMSG #${auth.TWITCH_CHANNEL} : Skipped playlist.`);
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