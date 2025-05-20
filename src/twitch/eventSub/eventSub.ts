
import auth from '../../auth.json' with {type: 'json'};
import { authenticateTwitchToken, isAuthResultSuccess } from '../auth.js';
import { Entity } from '../types.js';

export async function registerEventSubListener(entity: Entity, type: string, version: string, websocketSessionID: string, TWITCH_TOKEN: string) {
    console.log("REGISTERING EVENTS");
    let registerCounter = 0;
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
        console.log("register event sub result ", { result });
        console.log(`isStatus401: ${result.status === 401} && isInvalidToken: ${result.message === "Invalid OAuth token"}`);
        console.log("BEFORE ISAUTH.. -> AUTH JSON TOKEN: ", auth.BROADCASTER_TWITCH_TOKEN, "PASSED IN TOKEN: ", TWITCH_TOKEN);
        if (response.ok) return console.log(`Subscribed to ${result.data[0].type} [${result.data[0].id}]`);
        if (result.status === 401 && result.message === "Invalid OAuth token") {
            if (!isAuthResultSuccess(await authenticateTwitchToken('broadcaster'))) return;
            if (registerCounter < 1) {
                console.log("AFTER ISAUTH.. -> AUTH JSON TOKEN: ", auth.BROADCASTER_TWITCH_TOKEN, "PASSED IN TOKEN: ", TWITCH_TOKEN);
                await registerEventSubListener(entity, type, version, websocketSessionID, TWITCH_TOKEN);
                registerCounter += 1;
            }
        } else {
            console.log(`Register event subs error: ${result.status}: ${result.message}`);
        }
    } catch (e) {
        console.error(`Register event subs exceptional error: ${JSON.stringify(e)}`);
    }
}