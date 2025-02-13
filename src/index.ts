import { authenticateTwitchToken } from './auth.js';
import auth from './auth.json' with {type: 'json'};
import { startTwitchWebSocketClient } from './twitchWebsocketClient.js';
const EVENTSUB_WEBSOCKET_URL = 'wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=30';
//const EVENTSUB_WEBSOCKET_URL = 'ws://0.0.0.0:8090/ws';
await authenticateTwitchToken('bot', auth.BOT_TWITCH_TOKEN, auth.BOT_REFRESH_TWITCH_TOKEN);
await authenticateTwitchToken('broadcaster', auth.TWITCH_TOKEN, auth.REFRESH_TWITCH_TOKEN);
startTwitchWebSocketClient(EVENTSUB_WEBSOCKET_URL);



