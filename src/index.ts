import { authenticateTwitchToken } from './twitch/auth.js';
import auth from './auth.json' with {type: 'json'};
import config from '../config.json' with {type: 'json'};
console.log("NHANIFYYYYYYY", config.NHANIFY);
import { startTwitchEventSubWebSocketClient } from './twitch/eventSub/webSocketClient.js';
import { startTwitchIRCWebSocketClient } from './twitch/irc/webSocketClient.js';
import { startWebSocketServer } from './server/webSocketServer.js';
import { Queue } from './videoAPI/queue.js';
import { ChatQueue, Nhanify, NhanifyQueue, YTVideo } from './videoAPI/types.js';
import { getNhanifyRewards, rewards } from './twitch/api/reward.js';
const EVENTSUB_WEBSOCKET_URL = 'wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=30';
const IRC_WEBSOCKET_URL = 'wss://irc-ws.chat.twitch.tv:443';
//const EVENTSUB_WEBSOCKET_URL = 'ws://0.0.0.0:8090/ws';
const chatQueue = new Queue({ type: "chat", videos: [] } as ChatQueue);
type Config = { nhanify: Nhanify, queue: NhanifyQueue };
await authenticateTwitchToken('bot', auth.BOT_TWITCH_TOKEN, auth.BOT_REFRESH_TWITCH_TOKEN);
await authenticateTwitchToken('broadcaster', auth.TWITCH_TOKEN, auth.REFRESH_TWITCH_TOKEN);
await getNhanifyRewards();
async function getNhanifyVideos(): Promise<Config> {
    console.log("OUTSIDE IF GET NHANIFY VIDEOS", config.NHANIFY);
    if (config.NHANIFY) {
        console.log("GET NHANIFY VIDEOS", config.NHANIFY);
        try {
            const { nhanify } = await import('./videoAPI/nhanify/dataAPI.js');
            nhanify!.setPublicPlaylists();
            const { creator, title } = nhanify!.getPlaylist();//configure: nhanify
            const videos: YTVideo[] = await nhanify!.getSongs();//configure: nhanify
            return { nhanify, queue: { type: "nhanify", title, creator, videos } } as Config;
        } catch (err) {
            console.error('Failed to load module:', err)
            return { nhanify: null, queue: { type: "nhanify", videos: [] } } as Config;
        }
    } else {
        console.log("IN ELSE WHERE videos is empty")
        return { nhanify: null, queue: { type: "nhanify", videos: [] } } as Config;
    }
}
const { nhanify, queue }: Config = await getNhanifyVideos();
console.log(queue);
const nhanifyQueue = new Queue(queue);
const { webSocketServerClients, setIrcClient } = startWebSocketServer(chatQueue, nhanifyQueue, nhanify, rewards);
const ircClient = await startTwitchIRCWebSocketClient(IRC_WEBSOCKET_URL, chatQueue, webSocketServerClients, nhanifyQueue, nhanify, rewards);
setIrcClient(ircClient);
await startTwitchEventSubWebSocketClient(EVENTSUB_WEBSOCKET_URL, ircClient, webSocketServerClients, nhanifyQueue, chatQueue);
