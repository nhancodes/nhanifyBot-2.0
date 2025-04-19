import auth from '../auth.json' with {type: 'json'};
import { writeFileSync } from 'fs';
import { ValidateResponse, RefreshResponse, WriteResponse, Entity, CreateResponse } from './types.js';
import open from 'open';
import { tokenPromiseBot, tokenPromiseBroadcaster } from '../server/webServer.js';

export async function authenticateTwitchToken(entity: Entity) {
  // validate the access token
  const accessToken = entity === 'bot' ? auth.BOT_TWITCH_TOKEN : auth.BROADCASTER_TWITCH_TOKEN;
  const refreshToken = entity === 'bot' ? auth.BOT_REFRESH_TWITCH_TOKEN : auth.BROADCASTER_REFRESH_TWITCH_TOKEN;

  const validateResult = await validate(accessToken);
  if (validateResult.type === "data") return console.log(`${validateResult.data.login} with ${JSON.stringify(validateResult.data.scopes)} scopes was successfully validated`);

  if (validateResult.type === "error" && validateResult.error.message === "invalid access token" || validateResult.error.message === "missing authorization token") {
    const refreshResult = await refresh(refreshToken);
    if (refreshResult.type === "data") {
      console.log("Success token refresh");
      const { refresh_token, access_token } = refreshResult.data;
      const writeResult = await write(entity, refresh_token, access_token);
      if (writeResult.type === "data") return console.log(`${writeResult.data.entity} tokens successfull written to auth.json`)
      console.log(`Write to json error: ${writeResult.error.message}`);
    }
    if (refreshResult.type === "error" && refreshResult.error.status === 400) {
      const userId = entity === 'bot' ? auth.BOT_ID : auth.BROADCASTER_ID;
      const scope = entity === 'bot' ? 'chat:read+chat:edit' : 'channel:manage:redemptions+channel:read:redemptions';
      const url = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${auth.CLIENT_ID}&redirect_uri=http://localhost:${auth.WEB_SERVER_PORT}/authorize&force_verify=true&scope=${scope}&state=c3ab8aa609ea11e793ae92361f002671-${userId}-${scope}&nonce=c3ab8aa609ea11e793ae92361f002671 `;
      await open(url);
      const tokenPromise = entity === 'bot' ? await tokenPromiseBot as CreateResponse : await tokenPromiseBroadcaster as CreateResponse;
      if (tokenPromise.type === "data") {
        const { refresh_token, access_token } = tokenPromise.data;
        const writeResult = await write(entity, refresh_token, access_token);
        if (writeResult.type === "data") return console.log(`${writeResult.data.entity} tokens successfull written to auth.json`)
        console.log(`Write to json error: ${writeResult.error.message}`);
      }
      if (tokenPromise.type === "error") return console.log(`Created token error: ${tokenPromise.error.message}`);
    }
    if (refreshResult.type === "error") return console.log(refreshResult.error.message);
  }
  if (validateResult.type === "error") return console.log(validateResult.error.message);
}

export async function validate(TWITCH_TOKEN: string): Promise<ValidateResponse> {
  try {
    const response = await fetch('https://id.twitch.tv/oauth2/validate', {
      method: 'GET',
      headers: { 'Authorization': 'OAuth ' + TWITCH_TOKEN }
    });
    const data = await response.json();
    return response.ok ? { type: "data", data } : { type: "error", error: data }
  } catch (e) {
    return { type: "error", error: { message: JSON.stringify(e) } };
  }
}

export async function write(entity: Entity, updatedRefreshToken: string, updatedAccessToken: string): Promise<WriteResponse> {
  try {
    if (entity === 'bot') {
      auth.BOT_TWITCH_TOKEN = updatedAccessToken;
      auth.BOT_REFRESH_TWITCH_TOKEN = updatedRefreshToken;
    } else {
      auth.BROADCASTER_TWITCH_TOKEN = updatedAccessToken
      auth.BROADCASTER_REFRESH_TWITCH_TOKEN = updatedRefreshToken;
    }
    writeFileSync("./src/auth.json", JSON.stringify(auth));
    return { type: "data", data: { entity: entity } };
  } catch (e) {
    return { type: "error", error: { message: JSON.stringify(e) } };
  }
}

async function refresh(REFRESH_TWITCH_TOKEN: string): Promise<RefreshResponse> {
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
    return response.ok ? { type: "data", data } : { type: "error", error: data }
  } catch (e) {
    return { type: "error", error: { message: JSON.stringify(e) } };
  }
}
