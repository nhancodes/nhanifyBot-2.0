
import auth from '../../auth.json' with {type: 'json'};
import { authenticateTwitchToken, isAuthResultSuccess } from '../auth.js';
import { Entity } from '../types.js';

export async function registerEventSubListener(entity: Entity, type: string, version: string, websocketSessionID: string, TWITCH_TOKEN: string) {
    try {
        const subEventURL = `${auth.EVENTSUB_HOST}/eventsub/subscriptions`;
        let response = await fetch(subEventURL, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + TWITCH_TOKEN,
                'Client-Id': auth.CLIENT_ID,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: type,
                version: version,
                condition: {
                    broadcaster_user_id: auth.BROADCASTER_ID,
                    user_id: auth.BOT_ID
                },
                transport: {
                    method: 'websocket',
                    session_id: websocketSessionID
                }
            })
        });
        const result = await response.json();
        if (response.status === 202) console.log(`Subscribed to ${result.data[0].type} [${result.data[0].id}]`);
        if (result.message === "401: Failed to subscribe") {
            if(!isAuthResultSuccess(await authenticateTwitchToken('broadcaster'))) return;
            await registerEventSubListener(entity, type, version, websocketSessionID, TWITCH_TOKEN);
        }
    } catch (e) {
        console.error(e);
    }
}