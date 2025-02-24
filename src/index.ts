import { authenticateTwitchToken } from './twitch/auth.js';
import auth from './auth.json' with {type: 'json'};
import { startTwitchEventSubWebSocketClient } from './twitch/eventSub/webSocketClient.js';
import { startTwitchIRCWebSocketClient } from './twitch/irc/webSocketClient.js';
import { startWebSocketServer } from './server/webSocketServer.js';
import { Queue } from './videoAPI/queue.js';
import { ChatQueue, NhanifyQueue, YTVideo } from './videoAPI/types.js';
const EVENTSUB_WEBSOCKET_URL = 'wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=30';
const IRC_WEBSOCKET_URL = 'wss://irc-ws.chat.twitch.tv:443';
//const EVENTSUB_WEBSOCKET_URL = 'ws://0.0.0.0:8090/ws';
const chatQueue = new Queue({ type: "chat", videos: [] } as ChatQueue);
const videos: YTVideo[] = [
    { title: "Baby One More Time", id: "kAJz7c97Cyo" },
    { title: "A Bag of Weed", id: "jK8fAUlqbow" }
];

const nhanifyQueue = new Queue({ type: "nhanify", title: "Something Random", length: 1, videos } as NhanifyQueue);

const webSocketServerClients = startWebSocketServer(chatQueue, nhanifyQueue);
await authenticateTwitchToken('bot', auth.BOT_TWITCH_TOKEN, auth.BOT_REFRESH_TWITCH_TOKEN);
await authenticateTwitchToken('broadcaster', auth.TWITCH_TOKEN, auth.REFRESH_TWITCH_TOKEN);
const ircClient = await startTwitchIRCWebSocketClient(IRC_WEBSOCKET_URL, chatQueue, webSocketServerClients);
await startTwitchEventSubWebSocketClient(EVENTSUB_WEBSOCKET_URL, ircClient);



