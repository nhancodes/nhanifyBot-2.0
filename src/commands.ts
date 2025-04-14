import { WebSocket } from 'ws';
import { rewards } from './twitch/api/reward.js';
import { Queue } from './videoAPI/queue.js';
import { nhanify } from './videoAPI/nhanify/dataAPI.js';
import { Nhanify} from './videoAPI/types.js';
import auth from './auth.json' with {type: 'json'};
import { RewardRedeemEvent } from './twitch/eventSub/types.js';

/**
 * Skips the current song and plays the next one from either the chat or nhanify queue
 */
export async function playerSkipSong(webSocketServerClients: Set<WebSocket>, client: WebSocket, nhanifyQueue: Queue, chatQueue: Queue, chatter: string, nhanify: Nhanify) {
    try {
        if (Queue.getPlayingOn() === null) {
            return client.send(`PRIVMSG #${auth.BROADCASTER_NAME} : @${chatter}, all queues are empty.`);
        }
        
        // Remove current song from active queue
        Queue.getPlayingOn() === 'nhanify' ? nhanifyQueue.remove() : chatQueue.remove();
        
        // Priority: Chat queue > Nhanify queue > Empty state
        if (!chatQueue.isEmpty()) {
            // Play next song from chat queue
            Queue.setPlayingOn("chat");
            broadcastToClients(webSocketServerClients, {
                action: "play",
                queue: chatQueue.getQueue()
            });
            await rewards.setRewardsIsPause("chat");
        } else if (!nhanifyQueue.isEmpty()) {
            // Play next song from nhanify queue
            Queue.setPlayingOn("nhanify");
            broadcastToClients(webSocketServerClients, {
                action: "play",
                queue: nhanifyQueue.getQueue()
            });
            await rewards.setRewardsIsPause("nhanify");
        } else {
            // Both queues are empty, try to get a new nhanify playlist
            if (nhanify) {
                Queue.setPlayingOn("nhanify");
                const config = await nhanify.nextPlaylist();
                const { videos, title, creator } = config;
                
                nhanifyQueue.nextQueue({ type: "nhanify", title, creator, videos });
                broadcastToClients(webSocketServerClients, {
                    action: "play",
                    queue: nhanifyQueue.getQueue()
                });
                await rewards.setRewardsIsPause("nhanify");
            } else {
                // No nhanify integration or no playlists available
                Queue.setPlayingOn(null);
                broadcastToClients(webSocketServerClients, {
                    action: "emptyQueues",
                    queue: null
                });
                await rewards.setRewardsIsPause("null");
            }
        }
    } catch (error) {
        console.error('Error in playerSkipSong:', error);
        // Try to notify the user about the error
        try {
            client.send(`PRIVMSG #${auth.BROADCASTER_NAME} : @${chatter}, there was an error skipping the song.`);
        } catch (e) {
            console.error('Failed to send error message to client:', e);
        }
    }
}

/**
 * Skips the current playlist and loads the next one from nhanify
 */
export async function playerSkipPlaylist(webSocketServerClients: Set<WebSocket>, client: WebSocket, nhanifyQueue: Queue, chatter: string, chatQueue: Queue) {
    try {
        if (nhanify && Queue.getPlayingOn() === "nhanify") {
            // Get the next playlist from nhanify
            const config = await nhanify.nextPlaylist();
            const { videos, title, creator, id } = config;
            nhanifyQueue.nextQueue({ type: "nhanify", title, creator, id, videos });
            
            // Priority: Chat queue > New nhanify queue
            if (!chatQueue.isEmpty()) {
                Queue.setPlayingOn("chat");
                broadcastToClients(webSocketServerClients, {
                    action: "play",
                    queue: chatQueue.getQueue()
                });
                await rewards.setRewardsIsPause("chat");
            } else if (!nhanifyQueue.isEmpty()) {
                Queue.setPlayingOn("nhanify");
                broadcastToClients(webSocketServerClients, {
                    action: "play",
                    queue: nhanifyQueue.getQueue()
                });
                await rewards.setRewardsIsPause("nhanify");
            } else {
                // If both queues are empty after getting next playlist
                Queue.setPlayingOn(null);
                broadcastToClients(webSocketServerClients, {
                    action: "emptyQueues",
                    queue: null
                });
                await rewards.setRewardsIsPause("null");
            }
        } else {
            client.send(`PRIVMSG #${auth.BROADCASTER_NAME} : @${chatter}, No playlist to skip.`);
        }
    } catch (error) {
        console.error('Error in playerSkipPlaylist:', error);
        try {
            client.send(`PRIVMSG #${auth.BROADCASTER_NAME} : @${chatter}, there was an error skipping the playlist.`);
        } catch (e) {
            console.error('Failed to send error message to client:', e);
        }
    }
}

/**
 * Handle player ready event and load the appropriate queue
 */
export async function playerReady(ws: WebSocket, chatQueue: Queue, nhanifyQueue: Queue, nhanify: Nhanify) {
    try {
        // Priority: Chat queue > Nhanify queue > New nhanify playlist > Empty state
        if (!chatQueue.isEmpty()) {
            Queue.setPlayingOn("chat");
            ws.send(JSON.stringify({ action: "play", queue: chatQueue.getQueue() }));
            await rewards.setRewardsIsPause("chat");
        } else if (!nhanifyQueue.isEmpty()) {
            Queue.setPlayingOn("nhanify");
            ws.send(JSON.stringify({ action: "play", queue: nhanifyQueue.getQueue() }));
            await rewards.setRewardsIsPause("nhanify");
        } else { // Both queues are empty
            if (nhanify) {
                Queue.setPlayingOn("nhanify");
                const config = await nhanify.nextPlaylist();
                const { videos, title, creator } = config;
                nhanifyQueue.nextQueue({ type: "nhanify", title, creator, videos });
                ws.send(JSON.stringify({ action: "play", queue: nhanifyQueue.getQueue() }));
                await rewards.setRewardsIsPause("nhanify");
            } else {
                // No nhanify integration or no playlists available
                Queue.setPlayingOn(null);
                ws.send(JSON.stringify({ action: "emptyQueues", queue: null }));
                await rewards.setRewardsIsPause("null");
            }
        }
    } catch (error) {
        console.error('Error in playerReady:', error);
        // Try to notify the client about the error
        try {
            ws.send(JSON.stringify({
                action: "error",
                message: "Failed to prepare player"
            }));
        } catch (e) {
            console.error('Failed to send error message to client:', e);
        }
    }
}

/**
 * Helper function to broadcast a message to all WebSocket clients
 */
function broadcastToClients(clients: Set<WebSocket>, message: any) {
    const serializedMessage = JSON.stringify(message);
    let failedClients = 0;
    
    clients.forEach(client => {
        try {
            if (client.readyState === WebSocket.OPEN) {
                client.send(serializedMessage);
            }
        } catch (error) {
            console.error('Error sending message to client:', error);
            failedClients++;
        }
    });
    
    if (failedClients > 0) {
        console.warn(`Failed to send message to ${failedClients} of ${clients.size} clients`);
    }
}