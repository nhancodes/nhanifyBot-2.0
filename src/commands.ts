import { WebSocket } from 'ws';
import { rewards } from './twitch/api/reward.js';
import { Queue } from './videoAPI/queue.js';
import { nhanify } from './videoAPI/nhanify/dataAPI.js';
import { Nhanify, NhanifyQueue, YTVideo } from './videoAPI/types.js';
import auth from './auth.json' with {type: 'json'};

export async function playerSkipSong(webSocketServerClients: Set<WebSocket>, client: WebSocket, nhanifyQueue: Queue, chatQueue: Queue, chatter: string, nhanify: Nhanify) {
    if (Queue.getPlayingOn() === null) return client.send(`PRIVMSG ${auth.TWITCH_ACCOUNT} : @${chatter}, all queues are empty.`);
    Queue.getPlayingOn() === 'nhanify' ? nhanifyQueue.remove() : chatQueue.remove()
    if (!chatQueue.isEmpty()) {
        Queue.setPlayingOn("chat");
        webSocketServerClients.forEach(client => {
            client.send(JSON.stringify({ action: "play", queue: chatQueue.getQueue() }));
        });
        rewards.setRewardsIsPause("chat");
    } else if (!nhanifyQueue.isEmpty()) {
        Queue.setPlayingOn("nhanify");
        webSocketServerClients.forEach(client => {
            client.send(JSON.stringify({ action: "play", queue: nhanifyQueue.getQueue() }));
        });

        rewards.setRewardsIsPause("nhanify");
    } else {
        if (nhanify) {
            // increment by playlistIndex mod playlistLength 
            Queue.setPlayingOn("nhanify");
            nhanify!.nextPlaylist();
            const nhanifyPlaylist = await nhanify!.getPlaylist();
            // make api call to get all the songs on the current playlist
            const nhanifySongs: YTVideo[] = await nhanify!.getSongs();
            // set the nhanify playlist queue to the new songs
            nhanifyQueue.nextQueue({ type: "nhanify", title: nhanifyPlaylist.title, creator: nhanifyPlaylist.creator, videos: nhanifySongs });
            webSocketServerClients.forEach(client => {
                client.send(JSON.stringify({ action: "play", queue: nhanifyQueue.getQueue() }));
            });
            rewards.setRewardsIsPause("nhanify");
        } else {
            //configure to chat only
            Queue.setPlayingOn(null);
            webSocketServerClients.forEach(client => {
                client.send(JSON.stringify({ action: "emptyQueues", queue: null }));
            });
            rewards.setRewardsIsPause("null");
        }
    }
}

export async function playerSkipPlaylist(webSocketServerClients: Set<WebSocket>, client: WebSocket, nhanifyQueue: Queue, chatter: string, chatQueue: Queue) {
    if (nhanify && Queue.getPlayingOn() === "nhanify") {
        //Queue.setPlayingOn("nhanify");
        nhanify.nextPlaylist();
        const nhanifyPlaylist = await nhanify.getPlaylist();
        // make api call to get all the songs on the current playlist
        const nhanifySongs: YTVideo[] = await nhanify.getSongs();
        // set the nhanify playlist queue to the new songs
        nhanifyQueue.nextQueue({ type: "nhanify", title: nhanifyPlaylist.title, creator: nhanifyPlaylist.creator, videos: nhanifySongs });
        //check if chat of nhanify queue to populated
    
        if (!chatQueue.isEmpty()) {
            Queue.setPlayingOn("chat");
            webSocketServerClients.forEach(client => {
                client.send(JSON.stringify({ action: "play", queue: chatQueue.getQueue() }));
            });
            rewards.setRewardsIsPause("chat");
        nhanify.nextPlaylist();
        } else if (!nhanifyQueue.isEmpty()) {
            Queue.setPlayingOn("nhanify");
            webSocketServerClients.forEach(client => {
                client.send(JSON.stringify({ action: "play", queue: nhanifyQueue.getQueue() }));
            });
    
            rewards.setRewardsIsPause("nhanify");
        } 
        const queue = Queue.getPlayingOn() === "chat" ? chatQueue.getQueue() : Queue.getPlayingOn() === "nhanify" ? nhanifyQueue.getQueue() : null;
        webSocketServerClients.forEach(client => {
            client.send(JSON.stringify({ action: "play", queue }));
        });
    } else {
        client.send(`PRIVMSG ${auth.TWITCH_ACCOUNT} : @${chatter}, No playlist to skip.`);
    }
}

export async function playerReady(ws: WebSocket, chatQueue: Queue, nhanifyQueue: Queue, nhanify: Nhanify) {
    if (!chatQueue.isEmpty()) {
        Queue.setPlayingOn("chat");
        ws.send(JSON.stringify({ action: "play", queue: chatQueue.getQueue() }));
        //find the skiplaylist reward and set pause to true 
        rewards.setRewardsIsPause("chat");
    } else if (!nhanifyQueue.isEmpty()) {
        Queue.setPlayingOn("nhanify");
        ws.send(JSON.stringify({ action: "play", queue: nhanifyQueue.getQueue() }));
        rewards.setRewardsIsPause("nhanify");
    } else { // Queue is empty
        if (nhanify) {
            Queue.setPlayingOn("nhanify");
            // increment by playlistIndex mod playlistLength 
            nhanify!.nextPlaylist();
            const nhanifyPlaylist = await nhanify!.getPlaylist();
            // make api call to get all the songs on the current playlist
            const nhanifySongs: YTVideo[] = await nhanify!.getSongs();
            // set the nhanify playlist queue to the new songs
            nhanifyQueue.nextQueue({ type: "nhanify", title: nhanifyPlaylist.title, creator: nhanifyPlaylist.creator, videos: nhanifySongs } as NhanifyQueue);
            ws.send(JSON.stringify({ action: "play", queue: nhanifyQueue.getQueue() }));
            rewards.setRewardsIsPause("nhanify");
        } else {
            //configure: no nhanify playlists 
            Queue.setPlayingOn(null);
            ws.send(JSON.stringify({ action: "emptyQueues", queue: null }))
            rewards.setRewardsIsPause("null");
        }
    }
}