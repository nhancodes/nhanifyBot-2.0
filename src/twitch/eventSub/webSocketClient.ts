import WebSocket from 'ws';
import { Message, RewardRedeemEvent } from './types.js';
import commandsHandler from './commandsHandler.js';
import { registerEventSubListener } from './eventSub.js';
import auth from '../../auth.json' with {type: 'json'};
import { Queue } from '../../videoAPI/queue.js';
import { Nhanify } from '../../videoAPI/types.js';

export async function startTwitchEventSubWebSocketClient(EVENTSUB_WEBSOCKET_URL: string, ircClient: WebSocket, webSocketServerClients: Set<WebSocket>, nhanifyQueue: Queue, chatQueue: Queue, nhanify: Nhanify) {
    const websocketClients = [new WebSocket(EVENTSUB_WEBSOCKET_URL)];
    const websocketClient = websocketClients[0];
    console.log(`${EVENTSUB_WEBSOCKET_URL} Websocket client created`);
    websocketClient.on('error', () => {
        console.log(`${EVENTSUB_WEBSOCKET_URL} errors:`);
        console.error
    });

    let start = 0;
    websocketClient.on('open', () => {
        console.log('WebSocket connection opened to ' + EVENTSUB_WEBSOCKET_URL);
    });

    websocketClient.on('close', () => {
        console.log((performance.now() - start) / 1000);
        console.log('WebSocket connection closed on ' + EVENTSUB_WEBSOCKET_URL);
    });

    websocketClient.on('message', async (event: Buffer) => {
        try {
            start = (performance.now() - start) / 1000;
            console.log("TIME FROM LAST MESSAGE IN SECONDS", start);
            const eventObj = parseTwitchMessage(event.toString("utf8"));
            await handleWebSocketMessage(websocketClients, eventObj, ircClient, webSocketServerClients, nhanifyQueue, chatQueue, nhanify);
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

export async function handleWebSocketMessage(websocketClients: WebSocket[], data: Message, ircClient: WebSocket, webSocketServerClients: Set<WebSocket>, nhanifyQueue: Queue, chatQueue: Queue, nhanify: Nhanify) {
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
            websocketClients.push(await startTwitchEventSubWebSocketClient(data.payload.session.reconnect_url, ircClient, webSocketServerClients, nhanifyQueue, chatQueue, nhanify));
            break;
        case 'notification': // An EventSub notification has occurred, such as channel.chat.message
            const parsedSubscription = { ...data.payload.event, sub_type: data.payload.subscription.type } as RewardRedeemEvent;
            await commandsHandler(data.metadata.subscription_type, parsedSubscription, ircClient, webSocketServerClients, nhanifyQueue, chatQueue, nhanify);
            break;
    }
}
