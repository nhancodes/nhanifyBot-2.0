import auth from './auth.json' with {type: 'json'};
import { writeFileSync } from 'fs';
import { Entity } from './twitch/eventSub/types.js';

export async function authenticateTwitchToken(entity: Entity, TWITCH_TOKEN: string, REFRESH_TWITCH_TOKEN: string) {
    try {
        let response = await fetch('https://id.twitch.tv/oauth2/validate', {
            method: 'GET',
            headers: {
                'Authorization': 'OAuth ' + TWITCH_TOKEN
            }
        });
        if (response.status != 200) {
            let data = await response.json();
            throw new Error(`${response.status}`);
        }
        console.log(`${response.status}: Valid ${entity} token.`);
    } catch (e: any) {
        if (e.message === "401") {
            console.error(`${e.message}: Invalid ${entity} token.`);
            await updateAuth(entity, REFRESH_TWITCH_TOKEN);
        } else {
            console.error(e.message);
        }
    }
}

export async function updateAuth(entity: Entity, REFRESH_TWITCH_TOKEN: string) {
    let data = await refreshAuthToken(REFRESH_TWITCH_TOKEN);
    if ("access_token" in data) {
        if (entity === 'bot') {
            auth.BOT_TWITCH_TOKEN = data.access_token;
            auth.BOT_REFRESH_TWITCH_TOKEN = data.refresh_token;
        } else {
            auth.TWITCH_TOKEN = data.access_token;
            auth.REFRESH_TWITCH_TOKEN = data.refresh_token;
        }
        writeFileSync("./src/auth.json", JSON.stringify(auth));
        console.log(`Refreshing ${entity} token succeeded`);
    } else {
        console.log(`${data.status}: Refreshing ${entity} token failed`);
    }
}

async function refreshAuthToken(REFRESH_TWITCH_TOKEN: string) {
    let payload = {
        "grant_type": "refresh_token",
        "refresh_token": REFRESH_TWITCH_TOKEN,
        "client_id": auth.CLIENT_ID,
        "client_secret": auth.CLIENT_SECRET
    }
    let newToken = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(payload).toString()

    });
    return await newToken.json();
}
