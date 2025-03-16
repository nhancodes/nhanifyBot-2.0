import { WebSocket } from 'ws';
import { isValidURL, getVideoById, parseURL } from '../../videoAPI/youtube/dataAPI.js';
import { ParsedMessage } from './types.js';
import auth from '../../auth.json' with {type: 'json'};
import { Queue } from '../../videoAPI/queue.js';
import { Nhanify, YTVideo } from '../../videoAPI/types.js';

export async function commandsHandler(parsedMessage: ParsedMessage, client: WebSocket, chatQueue: Queue, webSocketServerClients: Set<WebSocket>, nhanifyQueue: Queue, nhanify:Nhanify) {
    if (parsedMessage?.command?.type === "botCommand") {
        const chatter = parsedMessage.source?.nick;
        const channel = parsedMessage.command.channel;
        const botCommand = parsedMessage.command.botCommand;
        switch (botCommand) {
            case "bot2sr":
                const url = parsedMessage.command.botCommandParams ? parsedMessage.command.botCommandParams : "";
                try {
                    if (!isValidURL(url)) {
                        return client.send(`PRIVMSG ${channel} : @${chatter}, invalid Youtube video url.`);
                    }
                    const result = await getVideoById(parseURL(url), auth.YT_API_KEY);
                    if (result.videoId) {
                        chatQueue.add(result);
                        webSocketServerClients.forEach(client => {
                            client.send(JSON.stringify({ action: "add", queue: chatQueue.getQueue() }));
                        });
                        return client.send(`PRIVMSG ${channel} : @${chatter}, ${chatQueue.getLast()?.title} added to chat queue.`)
                    }
                    switch (result.restriction) {
                        case "liveStream":
                            client.send(`PRIVMSG ${channel} : @${chatter}, live streams are restricted.`);
                            break;
                        case "age":
                            client.send(`PRIVMSG ${channel} : @${chatter}, video is age restricted.`);
                            break;
                        case "region":
                            client.send(`PRIVMSG ${channel} : @${chatter}, video is restricted in the US.`);
                            break;
                        case "notEmbeddable":
                            client.send(`PRIVMSG ${channel} : @${chatter}, video can't be played on embedded player.`);
                            break;
                        case "duration":
                            client.send(`PRIVMSG ${channel} : @${chatter}, video duration can't be over 10 minutes.`);
                            break;
                        default:
                            client.send(`PRIVMSG ${channel} : @${chatter}, video does not exist. `);
                    }
                } catch (error) {
                    console.log(error);
                }
            case "bot2resume":
                if (Queue.getIsPlaying()) break;
                Queue.toggleIsPlaying();
                webSocketServerClients.forEach(client => {
                    client.send(JSON.stringify({ action: botCommand, queue: null }));
                });
                break;
            case "bot2pause":
                if (!Queue.getIsPlaying()) break;
                Queue.toggleIsPlaying();
                webSocketServerClients.forEach(client => {
                    client.send(JSON.stringify({ action: botCommand, queue: null }));
                });
                break;
            case "bot2skipSong":
                if (Queue.getPlayingOn() === null) return client.send(`PRIVMSG ${channel} : @${chatter}, all queues are empty.`);
                Queue.getPlayingOn() === 'nhanify' ? nhanifyQueue.remove() : chatQueue.remove()
                if (!chatQueue.isEmpty()) {
                    Queue.setPlayingOn("chat");
                    webSocketServerClients.forEach(client => {
                        client.send(JSON.stringify({ action: "play", queue: chatQueue.getQueue() }));
                    });
                } else if (!nhanifyQueue.isEmpty()) {
                    Queue.setPlayingOn("nhanify");
                    webSocketServerClients.forEach(client => {
                        client.send(JSON.stringify({ action: "play", queue: nhanifyQueue.getQueue() }));
                    });
                } else {
                    if (nhanify) {
                        // increment by playlistIndex mod playlistLength 
                        Queue.setPlayingOn("nhanify");
                        nhanify.nextPlaylist();
                        const nhanifyPlaylist = await nhanify.getPlaylist();
                        // make api call to get all the songs on the current playlist
                        const nhanifySongs:YTVideo[] = await nhanify.getSongs();
                        // set the nhanify playlist queue to the new songs
                        nhanifyQueue.nextQueue({ type: "nhanify", title: nhanifyPlaylist.title,creator: nhanifyPlaylist.creator, videos:nhanifySongs });
                        webSocketServerClients.forEach(client => {
                            client.send(JSON.stringify({ action: "play", queue: nhanifyQueue.getQueue() }));
                        });
                    } else {
                        //configure to chat only
                        Queue.setPlayingOn(null);
                        webSocketServerClients.forEach(client => {
                            client.send(JSON.stringify({ action: "emptyQueues", queue: null }));
                        });
                    }
                }
                break;
            case "song":
                const video = Queue.getPlayingOn() === "nhanify" ? nhanifyQueue.getFirst() : chatQueue.getFirst();
                const msg = Queue.getIsPlaying() ? `${video?.title} -> https://www.youtube.com/watch?v=${video?.videoId}` : `No song is currently playing.`;
                client.send(`PRIVMSG ${channel} : @${chatter}, ${msg}`);
                break;
        }
    }
}