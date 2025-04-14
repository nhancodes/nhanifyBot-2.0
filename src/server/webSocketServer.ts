import { WebSocketServer, WebSocket } from 'ws';
import { Queue } from '../videoAPI/queue.js';
import { webServer } from './webServer.js';
import auth from '../auth.json' with {type: 'json'};
import { Nhanify } from '../videoAPI/types.js';
import { Rewards } from '../twitch/api/reward.js';
import { playerReady } from '../commands.js';

// Ping interval in ms (15 seconds)
const PING_INTERVAL = 15000;

export function startWebSocketServer(chatQueue: Queue, nhanifyQueue: Queue, nhanify: Nhanify, rewards: Rewards) {
    // Create WebSocket server using the HTTP server
    const wss = new WebSocketServer({ server: webServer });
    console.log('WebSocketServer created.');
    
    // Track connected clients with their timestamp and alive status
    const clients = new Map<WebSocket, {
        isAlive: boolean,
        connectedAt: number
    }>();
    
    let ircClient: WebSocket | null = null;
    
    // Setup ping interval to detect broken connections
    const pingInterval = setInterval(() => {
        wss.clients.forEach((ws) => {
            const clientInfo = clients.get(ws);
            if (!clientInfo) {
                // No client info means it wasn't properly registered, terminate it
                return ws.terminate();
            }
            
            if (clientInfo.isAlive === false) {
                // Client failed to respond to last ping, terminate
                console.log('Terminating unresponsive WebSocket client');
                clients.delete(ws);
                return ws.terminate();
            }
            
            // Mark as not alive, will be set to alive when pong received
            clientInfo.isAlive = false;
            
            // Send ping
            try {
                ws.ping();
            } catch (error) {
                console.error('Error sending ping to client:', error);
                ws.terminate();
            }
        });
    }, PING_INTERVAL);
    
    // Setup server event handlers
    wss.on('connection', function connection(ws) {
        // Register client
        clients.set(ws, {
            isAlive: true,
            connectedAt: Date.now()
        });
        
        console.log(`New WebSocket client connected (total: ${wss.clients.size})`);
        
        // Handle pong messages (response to ping)
        ws.on('pong', () => {
            const clientInfo = clients.get(ws);
            if (clientInfo) {
                clientInfo.isAlive = true;
            }
        });
        
        // Handle connection errors
        ws.on('error', (error) => {
            console.error('WebSocket client error:', error);
        });
        
        // Handle client disconnection
        ws.on('close', () => {
            clients.delete(ws);
            console.log(`WebSocket client disconnected (total: ${wss.clients.size})`);
        });
        
        // Handle messages from clients
        ws.on('message', async function message(message) {
            try {
                const data = JSON.parse(message.toString());
                console.log(`Message received from client: ${JSON.stringify(data)}`);
                
                if (ircClient && ircClient.readyState === WebSocket.OPEN) {
                    switch (data.action) {
                        case "finished":
                            // if playing on is null we do not remove
                            if (Queue.getPlayingOn() === 'nhanify') nhanifyQueue.remove();
                            if (Queue.getPlayingOn() === 'chat') chatQueue.remove();
                            // Fall through to ready case
                        case "ready":
                            playerReady(ws, chatQueue, nhanifyQueue, nhanify);
                            break;
                        case "pause":
                        case "resume":
                            ircClient.send(`PRIVMSG #${auth.BROADCASTER_NAME} : Player ${data.action}d.`);
                            break;
                        case "skipSong":
                            ircClient.send(`PRIVMSG #${auth.BROADCASTER_NAME} : Skipped song.`);
                            break;
                        case "skipPlaylist":
                            ircClient.send(`PRIVMSG #${auth.BROADCASTER_NAME} : Skipped playlist.`);
                            break;
                        default:
                            console.log(`Unknown action: ${data.action}`);
                    }
                } else if (data.action === "ready") {
                    // Always handle ready even if IRC isn't connected
                    playerReady(ws, chatQueue, nhanifyQueue, nhanify);
                } else if (!ircClient) {
                    console.warn('IRC client not available for action:', data.action);
                } else {
                    console.warn('IRC client not in open state, current state:', ircClient?.readyState);
                }
            } catch (error) {
                console.error('Error handling WebSocket message:', error);
            }
        });
    });
    
    // Return cleanup function and client set
    return {
        webSocketServerClients: wss.clients,
        setIrcClient: (client: WebSocket) => {
            ircClient = client;
        },
        cleanup: () => {
            clearInterval(pingInterval);
            wss.clients.forEach((client) => {
                try {
                    client.terminate();
                } catch (e) {
                    console.error('Error during client cleanup:', e);
                }
            });
            wss.close();
        }
    };
}