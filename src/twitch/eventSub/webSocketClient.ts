import WebSocket from 'ws';
import { Message, RewardRedeemEvent } from './types.js';
import subscriptionsHandler from './subscriptionsHandler.js';
import { registerEventSubListener } from './eventSub.js';
import auth from '../../auth.json' with {type: 'json'};
import { Queue } from '../../videoAPI/queue.js';
import { Nhanify } from '../../videoAPI/types.js';

export async function startTwitchEventSubWebSocketClient(EVENTSUB_WEBSOCKET_URL: string, ircClient: WebSocket, webSocketServerClients: Set<WebSocket>, nhanifyQueue: Queue, chatQueue: Queue, nhanify: Nhanify) {
    let websocketClient = new WebSocket(EVENTSUB_WEBSOCKET_URL);
    console.log(`${EVENTSUB_WEBSOCKET_URL} Websocket client created`);
    websocketClient.on('error', (error) => {
        console.log(`${EVENTSUB_WEBSOCKET_URL} errors: ${error.toString()}`);
    });
    websocketClient.on('open', () => {
        console.log('WebSocket connection opened to ' + EVENTSUB_WEBSOCKET_URL);
    });

    websocketClient.on('close', (code, reason) => {
        console.log(`WebSocket connection closed on ${EVENTSUB_WEBSOCKET_URL} due to ${code}: ${reason}`);
        setTimeout(async () => {
            await startTwitchEventSubWebSocketClient(EVENTSUB_WEBSOCKET_URL, ircClient, webSocketServerClients, nhanifyQueue, chatQueue, nhanify)
        }, 5000)
    });

    websocketClient.on('message', async (event: Buffer) => {
        try {
            const eventObj = parseTwitchMessage(event.toString("utf8"));
            await handleWebSocketMessage(eventObj, ircClient, webSocketServerClients, nhanifyQueue, chatQueue, nhanify);
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

export async function handleWebSocketMessage(data: Message, ircClient: WebSocket, webSocketServerClients: Set<WebSocket>, nhanifyQueue: Queue, chatQueue: Queue, nhanify: Nhanify) {
    console.log("TYPE", data.message_type);
    switch (data.message_type) {
        case 'session_welcome': // First message you get from the WebSocket server when connecting
            console.log(data.payload.session.id);
            console.log("REGISTER EVENT SUBS");
            await registerEventSubListener('broadcaster', 'channel.channel_points_custom_reward_redemption.add', '1', data.payload.session.id, auth.BROADCASTER_TWITCH_TOKEN);
            break;
        case 'notification': // An EventSub notification has occurred, such as channel.chat.message
            const parsedSubscription = { ...data.payload.event, sub_type: data.payload.subscription.type } as RewardRedeemEvent;
            await subscriptionsHandler(data.metadata.subscription_type, parsedSubscription, ircClient, webSocketServerClients, nhanifyQueue, chatQueue, nhanify, parsedSubscription.user_input);
            break;
    }
}
