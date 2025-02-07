import WebSocket from 'ws';
import { writeFileSync } from 'fs';
import auth from './auth.json' with {type: 'json'};
import { WelcomeMessage, ReconnectMessage, NotificationMessage } from './types/twitch/index.js';
const EVENTSUB_WEBSOCKET_URL = 'wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=30';
//const EVENTSUB_WEBSOCKET_URL = 'ws://0.0.0.0:8090/ws';
let websocketSessionID: string;
type AnyMessage = WelcomeMessage | ReconnectMessage | NotificationMessage;

await getAuth();
const websocketClients = [await startWebSocketClient(EVENTSUB_WEBSOCKET_URL)];
const websocketClient = websocketClients[0];
async function startWebSocketClient(EVENTSUB_WEBSOCKET_URL: string) {
  let websocketClient = new WebSocket(EVENTSUB_WEBSOCKET_URL);
  console.log('Websocket client created');
  websocketClient.addEventListener('error', console.error);

  let start = 0;
  websocketClient.on('open', () => {
    //    start = performance.now();
    console.log('WebSocket connection opened to ' + EVENTSUB_WEBSOCKET_URL);
  });

  websocketClient.on('close', () => {
    console.log((performance.now() - start) / 1000);
    console.log('WebSocket connection closed on ' + EVENTSUB_WEBSOCKET_URL);
  });

  websocketClient.on('message', async (event: any) => {
    try {
      console.log("DATA", event.toString());
      start = (performance.now() - start) / 1000;
      console.log("TIME FROM LAST MESSAGE IN SECONDS", start);
      //const eventObj = JSON.parse(event.toString()) as anyEvent;
      const eventObj = parseTwitchMessage(event.toString());
      handleWebSocketMessage(eventObj);
    } catch (e) {
      console.error(e);
    }
  });

  return websocketClient;
}
function parseTwitchMessage(jsonString: string): AnyMessage {
  const obj = JSON.parse(jsonString);
  return {
    // Here we manually make sure that the message_type exists on the root object
    message_type: obj.metadata.message_type,
    // But we keep the rest of the object
    ...obj
  } as AnyMessage;
}
//let registerCallCount = 0;
async function handleWebSocketMessage(data: AnyMessage) {
  //  console.log({ registerCallCount });

  console.log({ data });
  switch (data.message_type) {
    //init oldconnection to undefined
    case 'session_welcome': // First message you get from the WebSocket server when connecting
      websocketSessionID = data.payload.session.id; // Register the Session ID it gives us
      // Listen to EventSub, which joins the chatroom from your bot's account
      // if old connection is undefined
      if (!websocketClients[1]) registerEventSubListeners();
      // reassign old connection to undefined
      if (websocketClients.length === 2) {
        const oldWebSocket = websocketClients.shift()
        oldWebSocket?.close();
      }
      break;
    case 'session_reconnect':
      //change current ws to the reconnect url
      //console.log("THE DATA IN RECONNECT", data);
      //console.log("THE URL IN RECONNECT", data.payload.reconnect_url);
      websocketClients.push(await startWebSocketClient(data.payload.session.reconnect_url));
      break;
    case 'notification': // An EventSub notification has occurred, such as channel.chat.message
      switch (data.payload.event.type) {
        case 'channel.chat.message':
          // First, print the message to the program's console.
          console.log(`MSG #${data.payload.event.broadcaster_user_login} <${data.payload.event.chatter_user_login}> ${data.payload.event.message.text}`);

          // Then check to see if that message was "HeyGuys"
          if (data.payload.event.message.text.trim() === "test") {
            // If so, send back "VoHi:wYo" to the chatroom
            sendChatMessage("it works")
          }
          break;
      }
      break;
  }
}

async function registerEventSubListeners() {
  try {
    let response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + auth.BOT_TWITCH_TOKEN,
        'Client-Id': auth.CLIENT_ID,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'channel.chat.message',
        version: '1',
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

    if (response.status != 202) {
      let data = await response.json();
      console.error("Failed to subscribe to channel.chat.message. API call returned status code " + response.status);
      throw new Error(`${response.status}: Failed to subscribe`);
    } else {
      const data = await response.json();
      console.log(`Subscribed to channel.chat.message [${data.data[0].id}]`);
    }
  } catch (e: any) {
    console.log("IN MESSAGE HANDLER", e.message);
    if (e.message === "401: Failed to subscribe") {
      await updateAuth(auth.BOT_REFRESH_TWITCH_TOKEN);
      registerEventSubListeners();
    }
  }
}

async function sendChatMessage(chatMessage: string) {
  try {
    let response = await fetch('https://api.twitch.tv/helix/chat/messages', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + auth.BOT_TWITCH_TOKEN,
        'Client-Id': auth.CLIENT_ID,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        broadcaster_id: auth.BROADCASTER_ID,
        sender_id: auth.BOT_ID,
        message: chatMessage
      })
    });
    if (response.status != 200) {
      let data = await response.json();
      console.error("Failed to send chat message");
      throw new Error(`${data.status}`);
    } else {
      console.log("Sent chat message: " + chatMessage);
    }
  } catch (e: any) {
    if (e.message = "401") {
      await updateAuth(auth.BOT_REFRESH_TWITCH_TOKEN);
      sendChatMessage(chatMessage);
    } else {
      console.error(e);
    }
  }
}

async function getAuth() {
  // https://dev.twitch.tv/docs/authentication/validate-tokens/#how-to-validate-a-token
  try {
    let response = await fetch('https://id.twitch.tv/oauth2/validate', {
      method: 'GET',
      headers: {
        'Authorization': 'OAuth ' + auth.BOT_TWITCH_TOKEN
      }
    });
    console.log("AUTH", response.status);
    if (response.status != 200) {
      let data = await response.json();
      console.error("Token is not valid. /oauth2/validate returned status code " + response.status);
      throw new Error(`${response.status}`);
      //process.exit(1);
      // take this call outside 
      //await updateAuth(auth.BOT_REFRESH_TWITCH_TOKEN);
    }
    console.log("Validated token.");
  } catch (e: any) {
    console.log("THE ERROR", e.message);
    if (e.message === "401") {
      //makes a request for the new token and refresh token and sets them to the JSON file
      console.log("401 error caught");
      await updateAuth(auth.BOT_REFRESH_TWITCH_TOKEN);
    }
  }
}

async function refreshAuthToken(REFRESH_TWITCH_TOKEN: string) {
  //console.log({ REFRESH_TWITCH_TOKEN });
  let payload = {
    "grant_type": "refresh_token",
    "refresh_token": REFRESH_TWITCH_TOKEN,
    // keys are not the same as the api, might not work
    "client_id": auth.CLIENT_ID,
    "client_secret": auth.CLIENT_SECRET
  }
  //console.log({ payload });
  let newToken = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(payload).toString()

  });
  return await newToken.json();
}

async function updateAuth(REFRESH_TWITCH_TOKEN: string) {
  let data = await refreshAuthToken(REFRESH_TWITCH_TOKEN);
  //console.log({ data });
  if ("access_token" in data) {
    auth.BOT_TWITCH_TOKEN = data.access_token;
    auth.BOT_REFRESH_TWITCH_TOKEN = data.refresh_token;
    writeFileSync("./src/auth.json", JSON.stringify(auth));
  } else {
    console.log("THE REFRESHTOKEN STATUS", data.status);
    // refresh token does not work then go through the 
    // process of generating a new token by request for one.
  }
}
