import WebSocket from 'ws';
import { Message, RewardRedeemEvent } from './types.js';
import commandsHandler from './commandsHandler.js';
import { registerEventSubListener } from './eventSub.js';
import auth from '../../auth.json' with {type: 'json'};
import { Queue } from '../../videoAPI/queue.js';
import { Nhanify } from '../../videoAPI/types.js';

// Constants for reconnection backoff strategy
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000; // Start with 1 second delay

export async function startTwitchEventSubWebSocketClient(KEEPALIVE_INTERVAL_MS: number, EVENTSUB_WEBSOCKET_URL: string, ircClient: WebSocket, webSocketServerClients: Set<WebSocket>, nhanifyQueue: Queue, chatQueue: Queue, nhanify: Nhanify) {
    let isConnected = false;
    let reconnectAttempts = 0;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let websocketClients: WebSocket[] = [];
    
    // Function to create new connection with proper error handling
    const createConnection = () => {
        try {
            console.log(`Creating new EventSub WebSocket connection to ${EVENTSUB_WEBSOCKET_URL}`);
            const ws = new WebSocket(EVENTSUB_WEBSOCKET_URL);
            
            ws.on('error', handleError);
            
            ws.on('open', () => {
                console.log('EventSub WebSocket connection opened');
                isConnected = true;
                reconnectAttempts = 0; // Reset reconnect attempts on successful connection
            });
            
            ws.on('close', (code, reason) => {
                console.log(`EventSub WebSocket connection closed: ${code} - ${reason}`);
                isConnected = false;
                attemptReconnect();
            });
            
            ws.on('message', async (event: Buffer) => {
                try {
                    const eventObj = parseTwitchMessage(event.toString("utf8"));
                    await handleWebSocketMessage(KEEPALIVE_INTERVAL_MS, websocketClients, eventObj, ircClient, webSocketServerClients, nhanifyQueue, chatQueue, nhanify);
                } catch (e) {
                    console.error('Error processing EventSub message:', e);
                }
            });
            
            websocketClients = [ws]; // Replace the array instead of pushing to prevent memory leaks
            return ws;
        } catch (error) {
            console.error('Failed to create EventSub WebSocket connection:', error);
            isConnected = false;
            attemptReconnect();
            return null;
        }
    };
    
    // Handle WebSocket errors with proper logging
    const handleError = (error: Error) => {
        console.error(`EventSub WebSocket error: ${error.message}`);
        // Connection will be closed automatically after an error, triggering the close event
    };
    
    // Implement reconnection with exponential backoff
    const attemptReconnect = () => {
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
        }
        
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.error(`Maximum reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached for EventSub WebSocket`);
            return;
        }
        
        // Calculate delay with exponential backoff
        const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts);
        console.log(`Attempting to reconnect EventSub WebSocket in ${delay}ms (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
        
        reconnectTimeout = setTimeout(() => {
            reconnectAttempts++;
            
            // Clean up any existing connections before creating a new one
            if (websocketClients.length > 0) {
                websocketClients.forEach(client => {
                    try {
                        if (client.readyState !== WebSocket.CLOSED) {
                            client.terminate();
                        }
                    } catch (e) {
                        console.error('Error terminating WebSocket:', e);
                    }
                });
                websocketClients = [];
            }
            
            createConnection();
        }, delay);
    };
    
    // Start the initial connection
    const initialConnection = createConnection();
    
    // Setup a heartbeat to check connection health
    const heartbeatInterval = setInterval(() => {
        if (!isConnected) {
            console.log('EventSub WebSocket connection not active, attempting reconnect');
            attemptReconnect();
        }
    }, KEEPALIVE_INTERVAL_MS);
    
    // Return client and cleanup function
    return {
        client: initialConnection,
        cleanup: () => {
            if (heartbeatInterval) clearInterval(heartbeatInterval);
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            websocketClients.forEach(ws => {
                try {
                    ws.terminate();
                } catch (e) {
                    console.error('Error during WebSocket cleanup:', e);
                }
            });
        }
    };
}

function parseTwitchMessage(jsonString: string): Message {
    try {
        const obj = JSON.parse(jsonString);
        return {
            message_type: obj.metadata.message_type,
            ...obj
        } as Message;
    } catch (error) {
        console.error('Failed to parse Twitch message:', error, jsonString);
        // Return a default message to prevent crashes
        return {
            message_type: 'error',
            metadata: {
                message_id: '',
                message_timestamp: new Date().toISOString()
            },
            payload: {}
        } as any;
    }
}

export async function handleWebSocketMessage(KEEPALIVE_INTERVAL_MS: number, websocketClients: WebSocket[], data: Message, ircClient: WebSocket, webSocketServerClients: Set<WebSocket>, nhanifyQueue: Queue, chatQueue: Queue, nhanify: Nhanify) {
    try {
        // console.log("TYPE", data.message_type);
        switch (data.message_type) {
            case 'session_welcome': // First message you get from the WebSocket server when connecting
                if (websocketClients.length === 1) {
                    await registerEventSubListener('broadcaster', 'channel.channel_points_custom_reward_redemption.add', '1', data.payload.session.id, auth.BROADCASTER_TWITCH_TOKEN);
                } else {
                    // Clean up older connections when a new one is established
                    websocketClients.slice(0, -1).forEach(client => {
                        try {
                            if (client.readyState !== WebSocket.CLOSED) {
                                client.close();
                            }
                        } catch (e) {
                            console.error('Error closing outdated WebSocket client:', e);
                        }
                    });
                    
                    // Keep only the newest connection
                    websocketClients.length = 1;
                }
                break;
            case 'session_reconnect':
                try {
                    console.log('Received session_reconnect event, connecting to new URL');
                    const newWs = new WebSocket(data.payload.session.reconnect_url);
                    websocketClients.push(newWs);
                    
                    // Setup event handlers for new connection
                    newWs.on('error', (error) => {
                        console.error('Error in reconnected EventSub WebSocket:', error);
                    });
                    
                    newWs.on('open', () => {
                        console.log('Reconnected EventSub WebSocket connection opened');
                    });
                    
                    newWs.on('message', async (event: Buffer) => {
                        try {
                            const eventObj = parseTwitchMessage(event.toString("utf8"));
                            await handleWebSocketMessage(KEEPALIVE_INTERVAL_MS, websocketClients, eventObj, ircClient, webSocketServerClients, nhanifyQueue, chatQueue, nhanify);
                        } catch (e) {
                            console.error('Error processing message on reconnected EventSub WebSocket:', e);
                        }
                    });
                } catch (error) {
                    console.error('Failed to establish EventSub WebSocket connection during reconnect:', error);
                }
                break;
            case 'notification': // An EventSub notification has occurred, such as channel.chat.message
                const parsedSubscription = { ...data.payload.event, sub_type: data.payload.subscription.type } as RewardRedeemEvent;
                await commandsHandler(data.metadata.subscription_type, parsedSubscription, ircClient, webSocketServerClients, nhanifyQueue, chatQueue, nhanify);
                break;
            case 'session_keepalive':
                // Just a heartbeat from Twitch, no action needed
                break;
            default:
                console.log(`Unhandled EventSub message type: ${data.message_type}`);
                break;
        }
    } catch (error) {
        console.error('Error handling WebSocket message:', error);
    }
}