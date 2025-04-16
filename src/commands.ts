import { WebSocket } from 'ws';
import { rewards } from './twitch/api/reward.js';
import { Queue, savedVideos } from './videoAPI/queue.js';
import { isValidURL, getVideoById, parseURL } from './videoAPI/youtube/dataAPI.js';
import { nhanify } from './videoAPI/nhanify/dataAPI.js';
import { Nhanify } from './videoAPI/types.js';
import auth from './auth.json' with {type: 'json'};

export async function playerSaveSong(chatter: string, client: WebSocket, nhanifyQueue: Queue, chatQueue: Queue) {
    if (!Queue.getPlayingOn() || !Queue.getIsPlaying()) return client.send(`PRIVMSG #${auth.BROADCASTER_NAME} : @${chatter}, No song playing to save.`);
    const video = Queue.getPlayingOn() === "nhanify" ? nhanifyQueue.getFirst() : chatQueue.getFirst();
    if (video && video.videoId && chatter && chatter in savedVideos && savedVideos[chatter].includes(video.videoId)) {
        return client.send(`PRIVMSG #${auth.BROADCASTER_NAME} : @${chatter}, song is already saved.`);
    }
    try {
        let payload = {
            url: `https://www.youtube.com/watch?v=${video?.videoId}`,
            addedBy: chatter,
        }
        const response = await fetch(`${auth.NHANIFY_URL}/api/playlist/addSong`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${auth.NHANIFY_API_KEY}`,
                'User-Id': auth.NHANIFY_ID,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        switch (result.msg) {
            case 'success':
                client.send(`PRIVMSG #${auth.BROADCASTER_NAME} : @${chatter}, ${result.song.title} was added to your "Saved Song" playlist. You can find the playlist at ${auth.NHANIFY_URL}/your/playlists/1/playlist/1/${result.song.playlist_id}`);
                if (!(chatter! in savedVideos)) {
                    savedVideos[chatter!] = [video?.videoId!];
                } else {
                    savedVideos[chatter!].push(video?.videoId!);
                }
                break;
            case 'no_user_account':
                client.send(`PRIVMSG #${auth.BROADCASTER_NAME} : @${chatter}, Create an account at ${auth.NHANIFY_URL}.`);
                break;
            case 'playlist_max_limit':
                client.send(`PRIVMSG #${auth.BROADCASTER_NAME} : @${chatter}, The playlist has reached it's max number of songs.`);
                break;
            case 'duplicate_video_id':
                client.send(`PRIVMSG #${auth.BROADCASTER_NAME} : @${chatter}, This song has already been added to the playlist.`);
                break;
            default:
                client.send(`PRIVMSG #${auth.BROADCASTER_NAME} : @${chatter}, Oops! Something went wrong.`);
        }
    } catch (error) {
        console.error(error);
        client.send(`PRIVMSG #${auth.BROADCASTER_NAME} : Oops! Nhanify is not available.`);
    }
}
export async function playerRequestSong(webSocketServerClients: Set<WebSocket>, client: WebSocket, chatQueue: Queue, chatter: string, url: string) {
    const trimedUrl = url.trim();
    try {
        if (!isValidURL(trimedUrl)) {
            return client.send(`PRIVMSG #${auth.BROADCASTER_NAME} : @${chatter}, invalid Youtube video url.`);
        }
        const result = await getVideoById(parseURL(trimedUrl), auth.YT_API_KEY);
        if (result.videoId) {
            chatQueue.add(result);
            webSocketServerClients.forEach(client => {
                client.send(JSON.stringify({ action: "add", queue: chatQueue.getQueue() }));
            });
            return client.send(`PRIVMSG #${auth.BROADCASTER_NAME} : @${chatter}, ${chatQueue.getLast()?.title} added to chat queue.`)
        }
        switch (result.restriction) {
            case "liveStream":
                client.send(`PRIVMSG #${auth.BROADCASTER_NAME} : @${chatter}, live streams are restricted.`);
                break;
            case "age":
                client.send(`PRIVMSG #${auth.BROADCASTER_NAME} : @${chatter}, video is age restricted.`);
                break;
            case "region":
                client.send(`PRIVMSG #${auth.BROADCASTER_NAME} : @${chatter}, video is restricted in the US.`);
                break;
            case "notEmbeddable":
                client.send(`PRIVMSG #${auth.BROADCASTER_NAME} : @${chatter}, video can't be played on embedded player.`);
                break;
            case "duration":
                client.send(`PRIVMSG #${auth.BROADCASTER_NAME} : @${chatter}, video duration can't be over 10 minutes.`);
                break;
            default:
                client.send(`PRIVMSG #${auth.BROADCASTER_NAME} : @${chatter}, video does not exist. `);
        }
    } catch (error) {
        console.error(error);
    }
}
export async function playerSkipSong(webSocketServerClients: Set<WebSocket>, client: WebSocket, nhanifyQueue: Queue, chatQueue: Queue, chatter: string, nhanify: Nhanify) {
    if (Queue.getPlayingOn() === null) return client.send(`PRIVMSG #${auth.BROADCASTER_NAME} : @${chatter}, all queues are empty.`);
    Queue.getPlayingOn() === 'nhanify' ? nhanifyQueue.remove() : chatQueue.remove()
    if (!chatQueue.isEmpty()) {
        Queue.setPlayingOn("chat");
        webSocketServerClients.forEach(client => {
            client.send(JSON.stringify({ action: "play", queue: chatQueue.getQueue() }));
        });
        await rewards.setRewardsIsPause("chat");
    } else if (!nhanifyQueue.isEmpty()) {
        Queue.setPlayingOn("nhanify");
        webSocketServerClients.forEach(client => {
            client.send(JSON.stringify({ action: "play", queue: nhanifyQueue.getQueue() }));
        });
        await rewards.setRewardsIsPause("nhanify");
    } else {
        if (nhanify) {
            // increment by playlistIndex mod playlistLength 
            Queue.setPlayingOn("nhanify");
            const config = await nhanify.nextPlaylist();
            const { videos, title, creator } = config;
            nhanifyQueue.nextQueue({ type: "nhanify", title, creator, videos });
            webSocketServerClients.forEach(client => {
                client.send(JSON.stringify({ action: "play", queue: nhanifyQueue.getQueue() }));
            });
            await rewards.setRewardsIsPause("nhanify");
        } else {
            //configure to chat only
            Queue.setPlayingOn(null);
            webSocketServerClients.forEach(client => {
                client.send(JSON.stringify({ action: "emptyQueues", queue: null }));
            });
            await rewards.setRewardsIsPause("null");
        }
    }
}

export async function playerSkipPlaylist(webSocketServerClients: Set<WebSocket>, client: WebSocket, nhanifyQueue: Queue, chatter: string, chatQueue: Queue) {
    if (nhanify && Queue.getPlayingOn() === "nhanify") {
        const config = await nhanify.nextPlaylist();
        const { videos, title, creator } = config;
        nhanifyQueue.nextQueue({ type: "nhanify", title, creator, videos });
        //check if chat of nhanify queue to populated
        if (!chatQueue.isEmpty()) {
            Queue.setPlayingOn("chat");
            webSocketServerClients.forEach(client => {
                client.send(JSON.stringify({ action: "play", queue: chatQueue.getQueue() }));
            });
            await rewards.setRewardsIsPause("chat");
            await nhanify.nextPlaylist();
        } else if (!nhanifyQueue.isEmpty()) {
            Queue.setPlayingOn("nhanify");
            webSocketServerClients.forEach(client => {
                client.send(JSON.stringify({ action: "play", queue: nhanifyQueue.getQueue() }));
            });

            await rewards.setRewardsIsPause("nhanify");
        }
        const queue = Queue.getPlayingOn() === "chat" ? chatQueue.getQueue() : Queue.getPlayingOn() === "nhanify" ? nhanifyQueue.getQueue() : null;
        webSocketServerClients.forEach(client => {
            client.send(JSON.stringify({ action: "play", queue }));
        });
    } else {
        client.send(`PRIVMSG #${auth.BROADCASTER_NAME} : @${chatter}, No playlist to skip.`);
    }
}

export async function playerReady(ws: WebSocket, chatQueue: Queue, nhanifyQueue: Queue, nhanify: Nhanify) {
    if (!chatQueue.isEmpty()) {
        Queue.setPlayingOn("chat");
        ws.send(JSON.stringify({ action: "play", queue: chatQueue.getQueue() }));
        //find the skiplaylist reward and set pause to true 
        await rewards.setRewardsIsPause("chat");
    } else if (!nhanifyQueue.isEmpty()) {
        Queue.setPlayingOn("nhanify");
        ws.send(JSON.stringify({ action: "play", queue: nhanifyQueue.getQueue() }));
        await rewards.setRewardsIsPause("nhanify");
    } else { // Queue is empty
        if (nhanify) {
            Queue.setPlayingOn("nhanify");
            const config = await nhanify.nextPlaylist();
            const { videos, title, creator } = config;
            nhanifyQueue.nextQueue({ type: "nhanify", title, creator, videos });
            ws.send(JSON.stringify({ action: "play", queue: nhanifyQueue.getQueue() }));
            await rewards.setRewardsIsPause("nhanify");
        } else {
            //configure: no nhanify playlists 
            Queue.setPlayingOn(null);
            ws.send(JSON.stringify({ action: "emptyQueues", queue: null }))
            await rewards.setRewardsIsPause("null");
        }
    }
}