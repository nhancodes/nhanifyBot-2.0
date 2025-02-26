import WebSocket, { WebSocketServer } from 'ws';
import { updateAuth } from '../auth.js';
import auth from '../../auth.json' with {type: 'json'};
import { parseMessage } from './parse/message.js';
import { commandsHandler } from './commandsHandler.js';
import { Queue } from '../../videoAPI/queue.js';

export async function startTwitchIRCWebSocketClient(IRC_WEBSOCKET_URL: string, chatQueue: Queue, webSocketServerClients: Set<WebSocket>) {
  const client = new WebSocket(IRC_WEBSOCKET_URL);
  console.log(`${IRC_WEBSOCKET_URL} Websocket client created`);
  client.on('error', () => {
    console.log(`${IRC_WEBSOCKET_URL} errors:`);
    console.error
  });

  client.on('close', () => {
    console.log('WebSocket connection closed on ' + IRC_WEBSOCKET_URL);
  });

  client.on("open", async () => {
    console.log(`WebSocket connection opened to ${IRC_WEBSOCKET_URL}`);
    client.send(`PASS oauth:${auth.BOT_TWITCH_TOKEN}`);
    client.send(`NICK ${auth.TWITCH_ACCOUNT}`);//nhanifybot
    client.send(`JOIN #${auth.TWITCH_CHANNEL}`);//nhancodes
  });
  client.on("message", async function (event: Buffer) {
    const message = event.toString('utf8').normalize("NFKC").replace(/\uDB40\uDC00/g, "").trim();
    if (message.startsWith('PING :tmi.twitch.tv')) {
      console.log({ message });
      client.send('PONG :tmi.twitch.tv');
    } else if (message.includes(":tmi.twitch.tv NOTICE * :Login authentication failed")) {
      console.log({ message });
      updateAuth('bot', auth.BOT_REFRESH_TWITCH_TOKEN);
    } else if (message.includes(":tmi.twitch.tv NOTICE * :Login unsuccessful")) {
      console.log({ message });
    } else {
      const parsedMessage = parseMessage(message);
      console.log(`Chat message from IRC server: ${parsedMessage?.parameters}`);
      commandsHandler(parsedMessage, client, chatQueue, webSocketServerClients);
    }
  });
  return client;
}