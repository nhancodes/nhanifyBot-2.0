
import WebSocket from 'ws';
import { authenticateTwitchToken } from './twitch/auth.js';
import auth from './auth.json' with {type: 'json'};
import { startTwitchEventSubWebSocketClient } from './twitch/eventSub/webSocketClient.js';
import { startTwitchIRCWebSocketClient } from './twitch/irc/webSocketClient.js';
import { startWebSocketServer } from './server/webSocketServer.js';
import { Queue } from './videoAPI/queue.js';
import { ChatQueue, Nhanify, NhanifyQueue } from './videoAPI/types.js';
import { getNhanifyRewards, rewards } from './twitch/api/reward.js';
import { config } from './configType.js';
type PlaylistsConfig = { nhanify: Nhanify, queue: NhanifyQueue };
const KEEPALIVE_INTERVAL_MS = 10000;
const EVENTSUB_WEBSOCKET_URL = `wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=${KEEPALIVE_INTERVAL_MS / 1000}`;
const IRC_WEBSOCKET_URL = 'wss://irc-ws.chat.twitch.tv:443';
//const EVENTSUB_WEBSOCKET_URL = 'ws://127.0.0.1:8080/ws';
const chatQueue = new Queue({ type: "chat", videos: [] } as ChatQueue);
await authenticateTwitchToken('bot', auth.BOT_TWITCH_TOKEN, auth.BOT_REFRESH_TWITCH_TOKEN);
await authenticateTwitchToken('broadcaster', auth.BROADCASTER_TWITCH_TOKEN, auth.BROADCASTER_REFRESH_TWITCH_TOKEN);

await getNhanifyRewards();
async function getNhanifyVideos(): Promise<PlaylistsConfig> {
    if (config.NHANIFY.enabled) {
        try {
            const { nhanify } = await import('./videoAPI/nhanify/dataAPI.js');
            if (nhanify) {
                config.NHANIFY.playlistsById.length === 0 ? await nhanify.setPublicPlaylists() : await nhanify!.setPlaylistsById(config.NHANIFY.playlistsById);
                if (nhanify!.playlists.length === 0) return { nhanify: null, queue: { type: "nhanify", videos: [] } } as PlaylistsConfig;

                const playlistsConfig = await nhanify.nextPlaylist();
                const { videos, title, creator, id } = playlistsConfig;
                return videos.length === 0 ? { nhanify: null, queue: { type: "nhanify", videos: [] } } as PlaylistsConfig : { nhanify, queue: { type: "nhanify", id, title, creator, videos } } as PlaylistsConfig;
            } else {
                return { nhanify: null, queue: { type: "nhanify", videos: [] } } as PlaylistsConfig;
            }
        } catch (err) {
            console.error('Failed to load module:', err)
            return { nhanify: null, queue: { type: "nhanify", videos: [] } } as PlaylistsConfig;
        }

    } else {
        return { nhanify: null, queue: { type: "nhanify", videos: [] } } as PlaylistsConfig;
    }
}
const { nhanify, queue }: PlaylistsConfig = await getNhanifyVideos();
const nhanifyQueue = new Queue(queue);
const { webSocketServerClients, setIrcClient } = startWebSocketServer(chatQueue, nhanifyQueue, nhanify, rewards);
const ircClient = await startTwitchIRCWebSocketClient(setIrcClient, IRC_WEBSOCKET_URL, chatQueue, webSocketServerClients, nhanifyQueue, nhanify, rewards);
setIrcClient(ircClient);
await startTwitchEventSubWebSocketClient(EVENTSUB_WEBSOCKET_URL, ircClient, webSocketServerClients, nhanifyQueue, chatQueue, nhanify);