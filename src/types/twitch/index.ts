export interface WelcomeMessage {
    message_type: "session_welcome",
    metadata: {
        message_id: string,
        message_timestamp: string
    },
    payload: {
        session: {
            id: string,
            status: "connected",
            connected_at: string,
            keepalive_timeout_seconds: number,
            reconnect_url: string
        }
    }
}

export interface NotificationMessage {
    message_type: "notification",
    metadata: {
        message_id: string,
        message_timestamp: string,
        subscription_type: string,
        subscription_version: string,
    },
    payload: {
        subscription: {
            id: string,
            status: "enabled",
            type: string,
            version: string,
            cost: number,
            condition: {
                broadcaster_user_id: string,
                user_id: string,
            },
            transport: {
                method: "websocket",
                session_id: string,
                created_at: string,
            },
        },
        event: {
            type: "channel.chat.message",
            version: 1,
            condition: {
                broadcaster_user_id: string,
                user_id: string
            },
            transport: {
                method: "websocket",
            }
        },
    }
}

export interface Event {
    type: "channel.chat.message",
    version: 1,
    condition: {
        broadcaster_user_id: string,
        user_id: string
    },
    transport: {
        method: "websocket",
    }
}

export interface ReconnectMessage {
    message_type: "session_reconnect",
    metadata: {
        message_id: string,
        message_timestamp: string,
    },
    payload: {
        session: {
            id: string,
            status: "reconnecting",
            connected_at: string,
            keepalive_timeout_seconds: null,
            reconnect_url: string
        }
    }
}