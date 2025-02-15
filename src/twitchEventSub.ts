
import auth from './auth.json' with {type: 'json'};
import { updateAuth } from './auth.js';
import { Entity } from './types/twitch/index.js';

export async function registerEventSubListener(entity: Entity, type: string, version: string, websocketSessionID: string, TWITCH_TOKEN: string) {
    try {
        let response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
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
                    //moderator_user_id: auth.BROADCASTER_ID
                },
                transport: {
                    method: 'websocket',
                    session_id: websocketSessionID
                }
            })
        });
        if (response.status != 202) {
            console.log("HERE IS THE ERROR", await response.json());
            throw new Error(`${response.status}: Failed to subscribe`);
        }
        let data = await response.json();
        console.log(data.data);
        console.log(`Subscribed to ${data.data[0].type} [${data.data[0].id}]`);
    } catch (e: any) {
        if (e.message === "401: Failed to subscribe") {
            console.error(e.message);
            if (entity === 'bot') {
                await updateAuth(entity, auth.BOT_REFRESH_TWITCH_TOKEN);
            } else {
                await updateAuth(entity, auth.REFRESH_TWITCH_TOKEN);
            }
            registerEventSubListener(entity, type, version, websocketSessionID, TWITCH_TOKEN);
        } else {
            console.error(e);
        }
    }
}