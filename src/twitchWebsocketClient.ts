import WebSocket from 'ws';
import { ChannelChatMessageEvent, Message } from './types/twitch/index.js';
import handleSubscriptionEvent from './handleSubscriptionEvent.js';
import { registerEventSubListener } from './twitchEventSub.js';
import auth from './auth.json' with {type: 'json'};

export async function startTwitchWebSocketClient(EVENTSUB_WEBSOCKET_URL: string) {
    const websocketClients = [new WebSocket(EVENTSUB_WEBSOCKET_URL)];
    const websocketClient = websocketClients[0];
    console.log('Websocket client created');
    websocketClient.addEventListener('error', console.error);

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
            handleWebSocketMessage(websocketClients, eventObj);
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

export async function handleWebSocketMessage(websocketClients: WebSocket[], data: Message) {
    switch (data.message_type) {
        case 'session_welcome': // First message you get from the WebSocket server when connecting
            if (websocketClients.length === 1) {
                await registerEventSubListener('bot', 'channel.chat.message', '1', data.payload.session.id, auth.BOT_TWITCH_TOKEN);
                await registerEventSubListener('broadcaster', 'channel.channel_points_custom_reward_redemption.add', '1', data.payload.session.id, auth.TWITCH_TOKEN);
            }
            else {
                websocketClients.shift()?.close();
            }
            break;
        case 'session_reconnect':
            websocketClients.push(await startTwitchWebSocketClient(data.payload.session.reconnect_url));
            break;
        case 'notification': // An EventSub notification has occurred, such as channel.chat.message
            const parsedSubscription = { ...data.payload.event, sub_type: data.payload.subscription.type } as ChannelChatMessageEvent;
            handleSubscriptionEvent(data.metadata.subscription_type, parsedSubscription);
            break;
    }
}
