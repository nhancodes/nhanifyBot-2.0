import WebSocket, { WebSocketServer } from 'ws';
import { updateAuth } from '../auth.js';
import auth from '../../auth.json' with {type: 'json'};
import { parseMessage } from './parse/message.js';
import { commandsHandler } from './commandsHandler.js';
import { Queue } from '../../videoAPI/queue.js';
import { Nhanify} from '../../videoAPI/types.js';
import { Rewards } from '../api/reward.js';

// Constants for reconnection strategy
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000; // Start with 1 second delay

export async function startTwitchIRCWebSocketClient(IRC_WEBSOCKET_URL: string, chatQueue: Queue, webSocketServerClients: Set<WebSocket>, nhanifyQueue: Queue, nhanify: Nhanify, rewards: Rewards) {
  let reconnectAttempts = 0;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let isConnected = false;
  
  // Function to establish connection with proper error handling
  const createConnection = () => {
    try {
      console.log(`Creating new IRC WebSocket connection to ${IRC_WEBSOCKET_URL}`);
      const client = new WebSocket(IRC_WEBSOCKET_URL);
      
      client.on('error', (error) => {
        console.error(`IRC WebSocket error: ${error.message}`);
        // Connection will close automatically after error
      });
      
      client.on('close', (code, reason) => {
        console.log(`IRC WebSocket connection closed: ${code} - ${reason || 'No reason specified'}`);
        isConnected = false;
        attemptReconnect();
      });
      
      client.on("open", async () => {
        console.log(`IRC WebSocket connection opened to ${IRC_WEBSOCKET_URL}`);
        isConnected = true;
        reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        
        // Authenticate with Twitch IRC
        try {
          client.send(`PASS oauth:${auth.BOT_TWITCH_TOKEN}`);
          client.send(`NICK ${auth.BOT_NAME}`);
          client.send(`JOIN #${auth.BROADCASTER_NAME}`);
        } catch (error) {
          console.error('Error during IRC authentication:', error);
        }
      });
      
      client.on("message", async function (event: Buffer) {
        try {
          const message = event.toString('utf8').normalize("NFKC").replace(/\uDB40\uDC00/g, "").trim();
          
          if (message.startsWith('PING :tmi.twitch.tv')) {
            // Handle PING messages to prevent disconnection
            client.send('PONG :tmi.twitch.tv');
          } else if (message.includes(":tmi.twitch.tv NOTICE * :Login authentication failed")) {
            console.log('Authentication failed, refreshing token...');
            const refreshResult = await updateAuth('bot', auth.BOT_REFRESH_TWITCH_TOKEN);
            if (refreshResult.type === 'data') {
              console.log('Token refreshed successfully, reconnecting...');
              // Close and reconnect with new token
              client.close();
            }
          } else if (message.includes(":tmi.twitch.tv NOTICE * :Login unsuccessful")) {
            console.error('Login unsuccessful, check your credentials');
          } else {
            const parsedMessage = parseMessage(message);
            if (parsedMessage?.parameters) {
              console.log(`Chat message from IRC server: ${parsedMessage.parameters}`);
              commandsHandler(parsedMessage, client, chatQueue, webSocketServerClients, nhanifyQueue, nhanify, rewards);
            }
          }
        } catch (error) {
          console.error('Error processing IRC message:', error);
        }
      });
      
      return client;
    } catch (error) {
      console.error('Failed to create IRC WebSocket connection:', error);
      isConnected = false;
      attemptReconnect();
      return null;
    }
  };
  
  // Implement reconnection with exponential backoff
  const attemptReconnect = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error(`Maximum reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached for IRC WebSocket`);
      return;
    }
    
    // Calculate delay with exponential backoff
    const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts);
    console.log(`Attempting to reconnect IRC WebSocket in ${delay}ms (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
    
    reconnectTimeout = setTimeout(() => {
      reconnectAttempts++;
      createConnection();
    }, delay);
  };
  
  // Start the initial connection
  const client = createConnection();
  
  // Setup a heartbeat interval to check connection health
  const heartbeatInterval = setInterval(() => {
    if (client && client.readyState === WebSocket.OPEN) {
      try {
        // Send a ping to keep the connection alive
        client.ping();
      } catch (error) {
        console.error('Error sending ping to IRC server:', error);
      }
    } else if (!isConnected) {
      console.log('IRC WebSocket connection not active, attempting reconnect');
      attemptReconnect();
    }
  }, 30000); // Check every 30 seconds
  
  // Return client and cleanup function
  return {
    client,
    cleanup: () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (client) {
        try {
          client.terminate();
        } catch (e) {
          console.error('Error during IRC WebSocket cleanup:', e);
        }
      }
    }
  };
}