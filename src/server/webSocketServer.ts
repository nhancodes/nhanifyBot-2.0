import { WebSocketServer, WebSocket } from 'ws';
import { Queue } from '../videoAPI/queue.js';
import { webServer } from './webServer.js';
import auth from '../auth.json' with {type: 'json'};
import { Nhanify, NhanifyQueue, YTVideo } from '../videoAPI/types.js';
export function startWebSocketServer(chatQueue: Queue, nhanifyQueue: Queue, nhanify: Nhanify) {
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
                        if (!chatQueue.isEmpty()) {
                            Queue.setPlayingOn("chat");
                            ws.send(JSON.stringify({ action: "play", queue: chatQueue.getQueue() }));
                        } else if (!nhanifyQueue.isEmpty()) {
                            Queue.setPlayingOn("nhanify");
                            ws.send(JSON.stringify({ action: "play", queue: nhanifyQueue.getQueue() }));
                        } else { // Queue is empty
                            if (nhanify) {
                            Queue.setPlayingOn("nhanify");
                            // increment by playlistIndex mod playlistLength 
                            nhanify.nextPlaylist();
                            const nhanifyPlaylist = await nhanify.getPlaylist();
                            // make api call to get all the songs on the current playlist
                            const nhanifySongs:YTVideo[] = await nhanify.getSongs();
                            // set the nhanify playlist queue to the new songs
                            nhanifyQueue.nextQueue({ type: "nhanify", title: nhanifyPlaylist.title, creator: nhanifyPlaylist.creator, videos:nhanifySongs } as NhanifyQueue);
                            ws.send(JSON.stringify({ action: "play", queue: nhanifyQueue.getQueue() }));
                            } else {
                                //configure: no nhanify playlists 
                                Queue.setPlayingOn(null);
                                ws.send(JSON.stringify({ action: "emptyQueues", queue: null }))
                            }
                        }
                        break;
                    case "pause":
                    case "resume":
                        //in the future include chatter in properties to send over to the client from the irc to include as port of irc message
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