import { WebSocketServer, WebSocket } from 'ws';
import { Queue } from '../videoAPI/queue.js';
import { webServer } from './webServer.js';
import auth from '../auth.json' with {type: 'json'};
import { Nhanify, NhanifyQueue, YTVideo } from '../videoAPI/types.js';
import { Rewards } from '../twitch/api/reward.js';
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
                        if (!chatQueue.isEmpty()) {
                            Queue.setPlayingOn("chat");
                            ws.send(JSON.stringify({ action: "play", queue: chatQueue.getQueue() }));
                            //find the skiplaylist reward and set pause to true 
                            rewards.setRewardsIsPause("chat");
                            /*const skipPlaylistReward = rewards.getReward("NhanifyBot: Skip Playlist");
                            if (!skipPlaylistReward?.getIsPaused()) {
                                const updatedReward = await skipPlaylistReward?.setIsPaused(true);
                                if (updatedReward!.type === "success") {
                                    console.log(` Skip Playlist is ${skipPlaylistReward?.getIsPaused() ? "paused" : "resumed"}`);
                                }
                            }
                            const skipSongReward = rewards.getReward("NhanifyBot: Skip Song");
                            if (skipSongReward?.getIsPaused()) {
                                const updatedReward = await skipSongReward?.setIsPaused(false);
                                if (updatedReward!.type === "success") {
                                    console.log(` Skip Song is ${skipSongReward?.getIsPaused() ? "paused" : "resumed"}`);
                                }
                            }
                            */
                        } else if (!nhanifyQueue.isEmpty()) {
                            Queue.setPlayingOn("nhanify");
                            ws.send(JSON.stringify({ action: "play", queue: nhanifyQueue.getQueue() }));
                            rewards.setRewardsIsPause("nhanify");
                            //find the skiplaylist reward and set pause to false
                            /*const skipPlaylistReward = rewards.getReward("NhanifyBot: Skip Playlist");
                            if (skipPlaylistReward?.getIsPaused()) {
                                const updatedReward = await skipPlaylistReward?.setIsPaused(false);
                                if (updatedReward!.type === "success") {
                                    console.log(` Skip Playlist is ${skipPlaylistReward?.getIsPaused() ? "paused" : "resumed"}`);
                                }
                            }
                            const skipSongReward = rewards.getReward("NhanifyBot: Skip Song");
                            if (skipSongReward?.getIsPaused()) {
                                const updatedReward = await skipSongReward?.setIsPaused(false);
                                if (updatedReward!.type === "success") {
                                    console.log(` Skip Song is ${skipSongReward?.getIsPaused() ? "paused" : "resumed"}`);
                                }
                            }
                            */
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
                            rewards.setRewardsIsPause("nhanify");
                            //find the skiplaylist reward and set pause to true 
                            /*const skipPlaylistReward = rewards.getReward("NhanifyBot: Skip Playlist");
                            if (skipPlaylistReward?.getIsPaused()) {
                                const updatedReward = await skipPlaylistReward?.setIsPaused(false);
                                if (updatedReward!.type === "success") {
                                    console.log(` Skip Playlist is ${skipPlaylistReward?.getIsPaused() ? "paused" : "resumed"}`);
                                }
                            }
                            const skipSongReward = rewards.getReward("NhanifyBot: Skip Song");
                            if (skipSongReward?.getIsPaused()) {
                                const updatedReward = await skipSongReward?.setIsPaused(false);
                                if (updatedReward!.type === "success") {
                                    console.log(` Skip Song is ${skipSongReward?.getIsPaused() ? "paused" : "resumed"}`);
                                }
                            }
                            */
                            } else {
                                //configure: no nhanify playlists 
                                Queue.setPlayingOn(null);
                                ws.send(JSON.stringify({ action: "emptyQueues", queue: null }))
                                rewards.setRewardsIsPause("null");
                                // find skipPlaylist and skipSong and set pause to false 
                                /*const skipPlaylistReward = rewards.getReward("NhanifyBot: Skip Playlist");
                                if (!skipPlaylistReward?.getIsPaused()) {
                                    const updatedReward = await skipPlaylistReward?.setIsPaused(true);
                                    if (updatedReward!.type === "success") {
                                        console.log(` Skip Playlist is ${skipPlaylistReward?.getIsPaused() ? "paused" : "resumed"}`);
                                    }
                                }
                                const skipSongReward = rewards.getReward("NhanifyBot: Skip Song");
                                if (!skipSongReward?.getIsPaused()) {
                                    const updatedReward = await skipSongReward?.setIsPaused(true);
                                    if (updatedReward!.type === "success") {
                                        console.log(` Skip Song is ${skipSongReward?.getIsPaused() ? "paused" : "resumed"}`);
                                    }
                                }
                                */
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