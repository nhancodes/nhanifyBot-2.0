import { authenticateTwitchToken } from './twitch/auth.js';
import auth from './auth.json' with {type: 'json'};
import { startTwitchEventSubWebSocketClient } from './twitch/eventSub/webSocketClient.js';
import { startTwitchIRCWebSocketClient } from './twitch/irc/webSocketClient.js';
import { startWebSocketServer } from './server/webSocketServer.js';
import { Queue } from './videoAPI/queue.js';
import { ChatQueue, Nhanify, NhanifyQueue } from './videoAPI/types.js';
import { getNhanifyRewards, rewards } from './twitch/api/reward.js';
import { config } from './configType.js';

// Type definitions
type PlaylistsConfig = { nhanify: Nhanify, queue: NhanifyQueue };
type WebSocketClients = {
  ircClient: { client: WebSocket, cleanup: () => void };
  eventSubClient: { client: WebSocket, cleanup: () => void };
  webSocketServer: {
    webSocketServerClients: Set<WebSocket>,
    setIrcClient: (client: WebSocket) => void,
    cleanup: () => void
  };
};

// Configuration constants
const KEEPALIVE_INTERVAL_MS = 10000;
const EVENTSUB_WEBSOCKET_URL = `wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=${KEEPALIVE_INTERVAL_MS / 1000}`;
const IRC_WEBSOCKET_URL = 'wss://irc-ws.chat.twitch.tv:443';

// Global variables to track WebSocket connections for cleanup
let clients: WebSocketClients | null = null;

// Setup graceful shutdown
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Function to handle graceful shutdown
async function gracefulShutdown() {
  console.log('Shutting down gracefully...');
  
  // Clean up WebSocket connections
  if (clients) {
    console.log('Cleaning up WebSocket connections...');
    
    try {
      if (clients.ircClient) {
        clients.ircClient.cleanup();
      }
      
      if (clients.eventSubClient) {
        clients.eventSubClient.cleanup();
      }
      
      if (clients.webSocketServer) {
        clients.webSocketServer.cleanup();
      }
    } catch (error) {
      console.error('Error during WebSocket cleanup:', error);
    }
  }
  
  console.log('Shutdown complete');
  process.exit(0);
}

// Main function to start the application
async function main() {
  console.log('Starting NhanifyBot 2.0...');
  
  // Initialize queues
  const chatQueue = new Queue({ type: "chat", videos: [] } as ChatQueue);
  
  try {
    // Authenticate with Twitch
    console.log('Authenticating with Twitch...');
    await authenticateTwitchToken('bot', auth.BOT_TWITCH_TOKEN, auth.BOT_REFRESH_TWITCH_TOKEN);
    await authenticateTwitchToken('broadcaster', auth.BROADCASTER_TWITCH_TOKEN, auth.BROADCASTER_REFRESH_TWITCH_TOKEN);
    
    // Get channel point rewards
    console.log('Initializing channel point rewards...');
    await getNhanifyRewards();
    
    // Initialize Nhanify integration
    console.log('Initializing Nhanify integration...');
    const { nhanify, queue }: PlaylistsConfig = await getNhanifyVideos();
    const nhanifyQueue = new Queue(queue);
    
    // Start WebSocket server
    console.log('Starting WebSocket server...');
    const webSocketServer = startWebSocketServer(chatQueue, nhanifyQueue, nhanify, rewards);
    
    // Start IRC WebSocket client
    console.log('Connecting to Twitch IRC...');
    const ircClientResult = await startTwitchIRCWebSocketClient(
      IRC_WEBSOCKET_URL,
      chatQueue,
      webSocketServer.webSocketServerClients,
      nhanifyQueue,
      nhanify,
      rewards
    );
    
    // Set IRC client in WebSocket server
    webSocketServer.setIrcClient(ircClientResult.client);
    
    // Start EventSub WebSocket client
    console.log('Connecting to Twitch EventSub...');
    const eventSubClientResult = await startTwitchEventSubWebSocketClient(
      KEEPALIVE_INTERVAL_MS,
      EVENTSUB_WEBSOCKET_URL,
      ircClientResult.client,
      webSocketServer.webSocketServerClients,
      nhanifyQueue,
      chatQueue,
      nhanify
    );
    
    // Store client references for cleanup
    clients = {
      ircClient: ircClientResult,
      eventSubClient: eventSubClientResult,
      webSocketServer
    };
    
    console.log('NhanifyBot 2.0 started successfully!');
  } catch (error) {
    console.error('Error starting NhanifyBot:', error);
    process.exit(1);
  }
}

// Helper function to get Nhanify videos
async function getNhanifyVideos(): Promise<PlaylistsConfig> {
  if (config.NHANIFY.enabled) {
      try {
          const { nhanify } = await import('./videoAPI/nhanify/dataAPI.js');
          if (nhanify) {
              config.NHANIFY.playlistsById.length === 0
                ? await nhanify.setPublicPlaylists()
                : await nhanify.setPlaylistsById(config.NHANIFY.playlistsById);
              
              if (nhanify.playlists.length === 0) {
                  console.log('No Nhanify playlists found');
                  return { nhanify: null, queue: { type: "nhanify", videos: [] } } as PlaylistsConfig;
              }

              const playlistsConfig = await nhanify.nextPlaylist();
              const { videos, title, creator, id } = playlistsConfig;
              
              if (videos.length === 0) {
                  console.log('No videos found in Nhanify playlist');
                  return { nhanify: null, queue: { type: "nhanify", videos: [] } } as PlaylistsConfig;
              }
              
              return {
                  nhanify,
                  queue: { type: "nhanify", id, title, creator, videos }
              } as PlaylistsConfig;
          } else {
              console.log('Nhanify integration not available');
              return { nhanify: null, queue: { type: "nhanify", videos: [] } } as PlaylistsConfig;
          }
      } catch (err) {
          console.error('Failed to load Nhanify module:', err)
          return { nhanify: null, queue: { type: "nhanify", videos: [] } } as PlaylistsConfig;
      }
  } else {
      console.log('Nhanify integration disabled in config');
      return { nhanify: null, queue: { type: "nhanify", videos: [] } } as PlaylistsConfig;
  }
}

// Start the application
main().catch(error => {
  console.error('Unhandled error in main:', error);
  process.exit(1);
});