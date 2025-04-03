import auth from '../auth.json' with {type: 'json'};
import { writeFileSync } from 'fs';
import { Entity } from './eventSub/types.js';

async function createAuthToken() {

}

export async function authenticateTwitchToken(entity: Entity, TWITCH_TOKEN: string, REFRESH_TWITCH_TOKEN: string) {
    try {
        const response = await fetch('https://id.twitch.tv/oauth2/validate', {
            method: 'GET',
            headers: { 'Authorization': 'OAuth ' + TWITCH_TOKEN }
        });
        const body = await response.json();
        if (response.status === 200) {
            console.log(`${response.status}: Valid ${entity} token.`);
        } else if (response.status === 401 && body.message === "invalid access token") {
            console.error(`${entity} : ${JSON.stringify(body)}`);
            await updateAuth(entity, REFRESH_TWITCH_TOKEN);
        } else {
            console.error(`${entity} : ${JSON.stringify(body)}`);
        }
    } catch (e) {
        console.error(e);
    }
}

export async function updateAuth(entity: Entity, REFRESH_TWITCH_TOKEN: string) {
    try {
        let result = await refreshAuthToken(entity, REFRESH_TWITCH_TOKEN);
        if (result.type === "data") {
            const { access_token, refresh_token } = result.body;
            if (entity === 'bot') {
                auth.BOT_TWITCH_TOKEN = access_token;
                auth.BOT_REFRESH_TWITCH_TOKEN = refresh_token;
            } else {
                auth.TWITCH_TOKEN = access_token;
                auth.REFRESH_TWITCH_TOKEN = refresh_token;
            }
            writeFileSync("./src/auth.json", JSON.stringify(auth));
            console.log(`Wrote ${entity} token to json`);
        } else if (result.type === "error") {
            console.error(JSON.stringify(result.body));
        }
    } catch (e) {
        console.error(e);
    }
}

async function refreshAuthToken(entity: Entity, REFRESH_TWITCH_TOKEN: string) {
    const payload = {
        "grant_type": "refresh_token",
        "refresh_token": REFRESH_TWITCH_TOKEN,
        "client_id": auth.CLIENT_ID,
        "client_secret": auth.CLIENT_SECRET
    }
    try {
        const response = await fetch('https://id.twitch.tv/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(payload).toString()
        });
        const body = await response.json();
        if (response.status === 200) {
            console.log(`${response.status}: Refresh ${entity} token.`);
            return { type: "data", body };
        }
        return { type: "error", body };
    } catch (e) {
        return { type: "error", body: { message: "Something went wrong when refreshing token" } };
    }
}
