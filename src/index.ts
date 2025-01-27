import { writeFileSync } from 'fs';
import auth from './auth.json' with {type: 'json'};
const EVENTSUB_WEBSOCKET_URL = 'wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=30';
let websocketSessionID: string;
// Start executing the bot from here
(async () => {
  // Verify that the authentication is valid
  try {
    await getAuth();
  }catch (e:any) {
    if(e.message === "401") {
      await updateAuth(auth.BOT_REFRESH_TWITCH_TOKEN);
    }
  }
  // Start WebSocket client and register handlers
  const websocketClient = startWebSocketClient();
})();

function startWebSocketClient() {
  let websocketClient = new WebSocket(EVENTSUB_WEBSOCKET_URL);
  console.log('Websocket client created');
  websocketClient.addEventListener('error', console.error);

  let start = 0;
  websocketClient.addEventListener('open', () => {
    //    start = performance.now();
    console.log('WebSocket connection opened to ' + EVENTSUB_WEBSOCKET_URL);
  });

  websocketClient.addEventListener('close', (event) => {
    console.log((performance.now() - start) / 1000);
    console.log('WebSocket connection closed on ' + EVENTSUB_WEBSOCKET_URL);
  });

  websocketClient.addEventListener('message', (event: any) => {
    start = (performance.now() - start) / 1000;
    console.log("TIME FROM LAST MESSAGE IN SECONDS", start);
    if (event.data) {
      console.log(event.data.toString());
      handleWebSocketMessage(JSON.parse(event.data.toString()));
    } 
  });

  return websocketClient;
}

function handleWebSocketMessage(data: any) {
  switch (data.metadata.message_type) {
    case 'session_welcome': // First message you get from the WebSocket server when connecting
      websocketSessionID = data.payload.session.id; // Register the Session ID it gives us

      // Listen to EventSub, which joins the chatroom from your bot's account
      registerEventSubListeners();
      break;
    case 'notification': // An EventSub notification has occurred, such as channel.chat.message
      switch (data.metadata.subscription_type) {
        case 'channel.chat.message':
          // First, print the message to the program's console.
          console.log(`MSG #${data.payload.event.broadcaster_user_login} <${data.payload.event.chatter_user_login}> ${data.payload.event.message.text}`);

          // Then check to see if that message was "HeyGuys"
          if (data.payload.event.message.text.trim() == "HeyGuys") {
            // If so, send back "VoHi:wYo" to the chatroom
            sendChatMessage("VoHiYo")
          }

          break;
      }
      break;
  }
}

async function registerEventSubListeners() {
  // Register channel.chat.message
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
    console.error(data);
    process.exit(1);
  } else {
    const data = await response.json();
    console.log(`Subscribed to channel.chat.message [${data.data[0].id}]`);
  }
}
async function sendChatMessage(chatMessage: string) {
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
}

async function getAuth() {
  // https://dev.twitch.tv/docs/authentication/validate-tokens/#how-to-validate-a-token
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
    throw Error(`${response.status}`);
    //process.exit(1);
    // take this call outside 
    //await updateAuth(auth.BOT_REFRESH_TWITCH_TOKEN);
  }
    console.log("Validated token.");
}

async function refreshAuthToken(REFRESH_TWITCH_TOKEN: string) {
  console.log({ REFRESH_TWITCH_TOKEN });
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
  }
}
// Create WebSocket connection.
//const socket = new WebSocket("wss://eventsub.wss.twitch.tv/ws");

// Connection openedonst BOT_USER_ID = 'CHANGE_ME_TO_YOUR_BOTS_USER_ID'; // This is the User ID of the chat bot
/*
socket.addEventListener("open", (event) => {
  socket.send("Hello Server!");
});

// Listen for messages
socket.addEventListener("message", (event) => {
  console.log("Message from server ", event.data);
});
*/
