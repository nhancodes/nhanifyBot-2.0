import auth from '../auth.json' with {type: 'json'};
import { writeFileSync } from 'fs';
import { Entity } from './eventSub/types.js';
import open from 'open';
import { tokenPromiseBot, tokenPromiseBroadcaster } from '../server/webServer.js';

export async function authenticateTwitchToken(entity: Entity) {
    // validate the access token
    const accessToken = entity === 'bot' ? auth.BOT_TWITCH_TOKEN : auth.BROADCASTER_TWITCH_TOKEN;
    const validateResult = await validate(accessToken);
    /*
    // if success 
        // log out out the success data and return 
    // else check if error is 401? 
        // refresh the token
        // if successful write to the json
            // log the the success 
        // else if the error is something 400
            // get promise token from server 
            // await for the proper token 
            // write to the json 
            // if successful 
                // log success
            // log the error  
        // else
            // log out error 
    // log out the error
*/
}


export async function validate(TWITCH_TOKEN: string) {
    try {
        const response = await fetch('https://id.twitch.tv/oauth2/validate', {
            method: 'GET',
            headers: { 'Authorization': 'OAuth ' + TWITCH_TOKEN }
        });
        const data = await response.json();
        return response.status === 200 ? { type: "success", data } : { type: "error", data };
    } catch (e) {
        console.error(e);
        return { type: "error", data: JSON.stringify(e) };
    }
}

export async function writeToAuth(entity: Entity, updatedAuth: { [key: string]: string }): Promise<{ type: string; data: { [key: string]: string } }> {
    try {
        if (entity === 'bot') {
            auth.BOT_TWITCH_TOKEN = updatedAuth.access_token;
            auth.BOT_REFRESH_TWITCH_TOKEN = updatedAuth.refresh_token;
        } else {
            auth.BROADCASTER_TWITCH_TOKEN = updatedAuth.access_token;
            auth.BROADCASTER_REFRESH_TWITCH_TOKEN = updatedAuth.refresh_token;
        }
        writeFileSync("./src/auth.json", JSON.stringify(auth));
        return { type: "success", data: { message: `Updated ${entity}'s access and refresh token written to auth.json` } };
    } catch (e) {
        return { type: "error", data: { message: JSON.stringify(e) } };
    }
}

async function refreshAuthToken(REFRESH_TWITCH_TOKEN: string) {
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
        const data = await response.json();
        return response.ok ? { type: "success", data } : { type: "error", data }
    } catch (e) {
        return { type: "error", data: { message: JSON.stringify(e) } };
    }
}
