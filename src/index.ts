import WebSocket from 'ws';
import { writeFileSync } from 'fs';
import auth from './auth.json' with {type: 'json'};
import { ChannelChatMessageEvent, WelcomeMessage, ReconnectMessage, NotificationMessage } from './types/twitch/index.js';
const EVENTSUB_WEBSOCKET_URL = 'wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=30';
//const EVENTSUB_WEBSOCKET_URL = 'ws://0.0.0.0:8090/ws';
let websocketSessionID: string;
type AnyMessage = WelcomeMessage | ReconnectMessage | NotificationMessage;

await getAuth();
const websocketClients = [await startWebSocketClient(EVENTSUB_WEBSOCKET_URL)];
const websocketClient = websocketClients[0];

async function getAuth() {
  try {
    let response = await fetch('https://id.twitch.tv/oauth2/validate', {
      method: 'GET',
      headers: {
        'Authorization': 'OAuth ' + auth.BOT_TWITCH_TOKEN
      }
    });
    if (response.status != 200) {
      let data = await response.json();
      throw new Error(`${response.status}`);
    }
    console.log(`${response.status}: Validated token.`);
    } catch (e: any) {
      if (e.message === "401") {
        console.error(`${e.message}: Invalidate token.`);
        await updateAuth(auth.BOT_REFRESH_TWITCH_TOKEN);
      } else {
        console.error(e.message);
    }
  }
}

async function updateAuth(REFRESH_TWITCH_TOKEN: string) {
  let data = await refreshAuthToken(REFRESH_TWITCH_TOKEN);
  if ("access_token" in data) {
    auth.BOT_TWITCH_TOKEN = data.access_token;
    auth.BOT_REFRESH_TWITCH_TOKEN = data.refresh_token;
    writeFileSync("./src/auth.json", JSON.stringify(auth));
    console.log( `Refreshing token succeeded` );
  } else {
    console.log( `${data.status}: Refreshing token failed` );
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

async function startWebSocketClient(EVENTSUB_WEBSOCKET_URL: string) {
  let websocketClient = new WebSocket(EVENTSUB_WEBSOCKET_URL);
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
    message_type: obj.metadata.message_type,
    ...obj
  } as AnyMessage;
}

async function handleWebSocketMessage(data: AnyMessage) {
  switch (data.message_type) {
    case 'session_welcome': // First message you get from the WebSocket server when connecting
      websocketSessionID = data.payload.session.id; // Register the Session ID it gives us
      if (!websocketClients[1]) registerEventSubListeners();
      if (websocketClients.length === 2) {
        const oldWebSocket = websocketClients.shift()
        oldWebSocket?.close();
      }
      break;
    case 'session_reconnect':
      websocketClients.push(await startWebSocketClient(data.payload.session.reconnect_url));
      break;
    case 'notification': // An EventSub notification has occurred, such as channel.chat.message
      switch (data.metadata.subscription_type) {
        case 'channel.chat.message':
          const parsedSubscription = {...data.payload.event, sub_type: data.payload.subscription.type} as ChannelChatMessageEvent;
          console.log(`MSG #${parsedSubscription.broadcaster_user_login} <${parsedSubscription.chatter_user_login}> ${parsedSubscription.message.text}`);
          const cleaned = parsedSubscription.message.text.normalize("NFKC").replace(/\uDB40\uDC00/g, "").trim();
          if (cleaned === "test") {
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
      throw new Error(`${response.status}: Failed to subscribe`);
    }
      let data = await response.json();
      console.log(`Subscribed to channel.chat.message [${data.data[0].id}]`);
  } catch (e: any) {
    if (e.message === "401: Failed to subscribe") {
      console.error(e.message);
      await updateAuth(auth.BOT_REFRESH_TWITCH_TOKEN);
      registerEventSubListeners();
    } else {
      console.error(e);
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
      throw new Error(`${response.status}: Failed to send chat message`);
    }
      let data = await response.json();
      if (data.data[0].is_sent) console.log(`Sent chat message: ${chatMessage} `);
  } catch (e: any) {
    if (e.message === "401: Failed to send chat message") {
      console.error(e.message);
      await updateAuth(auth.BOT_REFRESH_TWITCH_TOKEN);
      sendChatMessage(chatMessage);
    } else {
      console.error(e);
    }
  }
}


