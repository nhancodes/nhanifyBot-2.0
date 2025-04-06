import WebSocket from 'ws';
import { Message, RewardRedeemEvent } from './types.js';
import commandsHandler from './commandsHandler.js';
import { registerEventSubListener } from './eventSub.js';
import auth from '../../auth.json' with {type: 'json'};
import { Queue } from '../../videoAPI/queue.js';
import { Nhanify } from '../../videoAPI/types.js';

export async function startTwitchEventSubWebSocketClient(KEEPALIVE_INTERVAL_MS: number, EVENTSUB_WEBSOCKET_URL: string, ircClient: WebSocket, webSocketServerClients: Set<WebSocket>, nhanifyQueue: Queue, chatQueue: Queue, nhanify: Nhanify) {
    let isConnected = true;
    let websocketClients = [new WebSocket(EVENTSUB_WEBSOCKET_URL)];
    const websocketClient = websocketClients[0];
    console.log(`${EVENTSUB_WEBSOCKET_URL} Websocket client created`);
    websocketClient.on('error', (error) => {
        console.log(`${EVENTSUB_WEBSOCKET_URL} errors: ${error.toString()}`);
    });
    const id = setInterval(async () => {
        console.log({isConnected});
        if(!isConnected) {
            websocketClients = [new WebSocket(EVENTSUB_WEBSOCKET_URL)];
            isConnected = true;
            console.log({isConnected, websocketClients});
        }
    }, KEEPALIVE_INTERVAL_MS);
    websocketClient.on('open', () => {
        console.log('WebSocket connection opened to ' + EVENTSUB_WEBSOCKET_URL);
    });

    websocketClient.on('close', () => {
        isConnected = false;
        console.log('WebSocket connection closed on ' + EVENTSUB_WEBSOCKET_URL);
    });

    websocketClient.on('message', async (event: Buffer) => {
        try {
            const eventObj = parseTwitchMessage(event.toString("utf8"));
            await handleWebSocketMessage(KEEPALIVE_INTERVAL_MS, websocketClients, eventObj, ircClient, webSocketServerClients, nhanifyQueue, chatQueue, nhanify);
        } catch (e) {
            console.error(e);
        }
    });

    return websocketClient;
}

function parseTwitchMessage(jsonString: string): Message {
    const obj = JSON.parse(jsonString);
    return {
        message_type: obj.metadata.message_type,
        ...obj
    } as Message;
}

export async function handleWebSocketMessage(KEEPALIVE_INTERVAL_MS: number, websocketClients: WebSocket[], data: Message, ircClient: WebSocket, webSocketServerClients: Set<WebSocket>, nhanifyQueue: Queue, chatQueue: Queue, nhanify: Nhanify) {
    //console.log("TYPE", data.message_type);
    switch (data.message_type) {
        case 'session_welcome': // First message you get from the WebSocket server when connecting
            if (websocketClients.length === 1) {
                await registerEventSubListener('broadcaster', 'channel.channel_points_custom_reward_redemption.add', '1', data.payload.session.id, auth.TWITCH_TOKEN);
            }
            else {
                websocketClients.shift()?.close();
            }
            break;
        case 'session_reconnect':
            websocketClients.push(new WebSocket(data.payload.session.reconnect_url));
            break;
        case 'notification': // An EventSub notification has occurred, such as channel.chat.message
            const parsedSubscription = { ...data.payload.event, sub_type: data.payload.subscription.type } as RewardRedeemEvent;
            await commandsHandler(data.metadata.subscription_type, parsedSubscription, ircClient, webSocketServerClients, nhanifyQueue, chatQueue, nhanify);
            break;
    }
}
