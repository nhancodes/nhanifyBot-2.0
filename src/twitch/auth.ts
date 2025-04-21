import auth from '../auth.json' with {type: 'json'};
import { ValidateResponse, RefreshResponse, WriteResponse, Entity, CreateResponse, AuthResult } from './types.js';
import { tokenPromiseBot, tokenPromiseBroadcaster } from '../server/webServer.js';
import { writeFileSync } from 'fs';
import open from 'open';

export function isAuthResultSuccess(result: AuthResult): boolean {
    if (result.type === "error") {
        console.log(result.error.message); 
        return false; 
    } 
    console.log(result.message);
    return true;
}

export async function authenticateTwitchToken(entity: Entity): Promise <AuthResult> {
  const accessToken = entity === 'bot' ? auth.BOT_TWITCH_TOKEN : auth.BROADCASTER_TWITCH_TOKEN;
  const refreshToken = entity === 'bot' ? auth.BOT_REFRESH_TWITCH_TOKEN : auth.BROADCASTER_REFRESH_TWITCH_TOKEN;
  // validate the access token
  const validateResult = await validate(accessToken);
  if (validateResult.type === "error" && (validateResult.error.message === "invalid access token" || validateResult.error.message === "missing authorization token")) {
    const refreshResult = await refresh(refreshToken);
    // refresh the access token
    if (refreshResult.type === "data") {
      // write token to json
      const { refresh_token, access_token } = refreshResult.data;
      const writeResult = await write(entity, refresh_token, access_token);
      return writeResult;
    }
    if (refreshResult.type === "error" && refreshResult.error.status === 400) {
      // authorize application on twitch account 
      const userId = entity === 'bot' ? auth.BOT_ID : auth.BROADCASTER_ID;
      const scope = entity === 'bot' ? 'chat:read+chat:edit' : 'channel:manage:redemptions+channel:read:redemptions';
      const url = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${auth.CLIENT_ID}&redirect_uri=http://localhost:${auth.WEB_SERVER_PORT}/authorize&force_verify=true&scope=${scope}&state=c3ab8aa609ea11e793ae92361f002671-${userId}-${scope}&nonce=c3ab8aa609ea11e793ae92361f002671 `;
      await open(url);

      // create new refresh and access token 
      const tokenPromise = entity === 'bot' ? await tokenPromiseBot as CreateResponse : await tokenPromiseBroadcaster as CreateResponse;
      if (tokenPromise.type === "data") {
        // write tokens to json
        const { refresh_token, access_token } = tokenPromise.data;
        const writeResult = await write(entity, refresh_token, access_token);
        return writeResult;
      }
      return tokenPromise;
    }
    return refreshResult;
  }
  return validateResult;
}

export async function validate(TWITCH_TOKEN: string): Promise<ValidateResponse> {
  try {
    const response = await fetch('https://id.twitch.tv/oauth2/validate', {
      method: 'GET',
      headers: { 'Authorization': 'OAuth ' + TWITCH_TOKEN }
    });
    const data = await response.json();
    return response.ok ? { type: "data", data, message:`${data.login} with ${JSON.stringify(data.scopes)} scopes was successfully validated` } : { type: "error", error: data }
  } catch (e) {
    return { type: "error", error: { message: `Validated token error: ${JSON.stringify(e)}` } };
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
    return { type: "data", data: { entity: entity }, message: `${entity} tokens successfully written to auth.json` };
  } catch (e) {
    return { type: "error", error: { message: `Write error: ${JSON.stringify(e)}` } };
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
    return response.ok ? { type: "data", data, message: `Access token successfully refreshed` } : { type: "error", error: data }
  } catch (e) {
    return { type: "error", error: { message: `Refresh token error: ${JSON.stringify(e)}`} };
  }
}
