import { writeFileSync } from 'fs';
import auth from './auth.json' with {type: 'json'};

// Start executing the bot from here
(async () => {
  // Verify that the authentication is valid
  await getAuth();

  // Start WebSocket client and register handlers
  //const websocketClient = startWebSocketClient();
})();

async function getAuth() {
  // https://dev.twitch.tv/docs/authentication/validate-tokens/#how-to-validate-a-token
  let response = await fetch('https://id.twitch.tv/oauth2/validate', {
    method: 'GET',
    headers: {
      'Authorization': 'OAuth ' + auth.BOT_TWITCH_TOKEN
    }
  });

  if (response.status != 200) {
    let data = await response.json();
    console.error("Token is not valid. /oauth2/validate returned status code " + response.status);
    console.error(data);
    //process.exit(1);
    await updateAuth(auth.REFRESH_TWITCH_TOKEN);
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
  console.log({ payload });
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
  console.log({ data });
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
