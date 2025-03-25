import { WebSocket } from 'ws';
import { isValidURL, getVideoById, parseURL } from '../../videoAPI/youtube/dataAPI.js';
import { ParsedMessage } from './types.js';
import auth from '../../auth.json' with {type: 'json'};
import { Queue, savedVideos } from '../../videoAPI/queue.js';
import { Nhanify, YTVideo } from '../../videoAPI/types.js';
import { Rewards } from '../api/reward.js';
import { playerSkipPlaylist, playerSkipSong } from '../../commands.js';
import { ircCommand } from './ircCommand.js';
export async function commandsHandler(parsedMessage: ParsedMessage, client: WebSocket, chatQueue: Queue, webSocketServerClients: Set<WebSocket>, nhanifyQueue: Queue, nhanify: Nhanify, rewards: Rewards) {
    if (parsedMessage?.command?.type === "botCommand") {
        const chatter = parsedMessage.source?.nick;
        const channel = parsedMessage.command.channel;
        const botCommand = parsedMessage.command.botCommand;
        if (chatter) ircCommand.setChatter(chatter);
        switch (botCommand) {
            case "sr":
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
            case "resume":
                if (Queue.getIsPlaying()) break;
                Queue.toggleIsPlaying();
                webSocketServerClients.forEach(client => {
                    client.send(JSON.stringify({ action: botCommand, queue: null }));
                });
                break;
            case "pause":
                if (!Queue.getIsPlaying()) break;
                Queue.toggleIsPlaying();
                // call the twitch api to pause redeemsgtgt
                webSocketServerClients.forEach(client => {
                    client.send(JSON.stringify({ action: botCommand, queue: null }));
                });
                break;
            case "skipSong":
                playerSkipSong(webSocketServerClients, client, nhanifyQueue, chatQueue, chatter!);
                break;
            case "song":
                const video = Queue.getPlayingOn() === "nhanify" ? nhanifyQueue.getFirst() : chatQueue.getFirst();
                const msg = Queue.getIsPlaying() ? `${video?.title} -> https://www.youtube.com/watch?v=${video?.videoId}` : `No song is currently playing.`;
                client.send(`PRIVMSG ${channel} : @${chatter}, ${msg}`);
                break;
            case "skipPlaylist":
                playerSkipPlaylist(webSocketServerClients, client, nhanifyQueue, chatter!);
                break;
            case "save": {
                if (!Queue.getPlayingOn() || !Queue.getIsPlaying()) return client.send(`PRIVMSG ${channel} : @${chatter}, No song playing to save.`);
                const video = Queue.getPlayingOn() === "nhanify" ? nhanifyQueue.getFirst() : chatQueue.getFirst();
                if (video && video.videoId && chatter && chatter in savedVideos && savedVideos[chatter].includes(video.videoId)) {
                    return client.send(`PRIVMSG ${channel} : @${chatter}, song is already saved.`);
                }
                try {
                    let payload = {
                        url: `https://www.youtube.com/watch?v=${video?.videoId}`,
                        addedBy: chatter,
                    }
                    const response = await fetch(`${auth.HOST}/api/playlist/addSong`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${auth.NHANIFY_API_KEY}`,
                            'User-Id': auth.NHANCODES_ID,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    });
                    const result = await response.json();
                    switch (result.msg) {
                        case 'success':
                            client.send(`PRIVMSG ${channel} : @${chatter}, ${result.song.title} was added to your "Saved Song" playlist. You can find the playlist at ${auth.HOST}/your/playlists/1/playlist/1/${result.song.playlist_id}`);
                            if (!(chatter! in savedVideos)) {
                                savedVideos[chatter!] = [video?.videoId!];
                            } else {
                                savedVideos[chatter!].push(video?.videoId!);
                            }
                            break;
                        case 'no_user_account':
                            client.send(`PRIVMSG ${channel} : @${chatter}, Create an account at ${auth.HOST}.`);
                            break;
                        case 'playlist_max_limit':
                            client.send(`PRIVMSG ${channel} : @${chatter}, The playlist has reached it's max number of songs.`);
                            break;
                        case 'duplicate_video_id':
                            client.send(`PRIVMSG ${channel} : @${chatter}, This song has already been added to the playlist.`);
                            break;
                        default:
                            client.send(`PRIVMSG ${channel} : @${chatter}, Oops! Something went wrong.`);
                    }
                } catch (error) {
                    console.error(error);
                    client.send(`PRIVMSG ${channel} : Oops! Nhanify is not available.`);
                }
            }
        }
    }
}