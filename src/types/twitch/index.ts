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
            created_at: string,
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
/*

{
  "metadata": {
    "message_id": "m7DP1l0hj6JSm5g7c9eZ_u5S1Ln-KE_NEPnXcr109KY=",
    "message_type": "notification",
    "message_timestamp": "2025-02-07T21:02:03.781485028Z",
    "subscription_type": "channel.chat.message",
    "subscription_version": "1"
  },
  "payload": {
    "subscription": {
      "id": "6d76f49e-e848-4117-9514-cf4d88fa173b",
      "status": "enabled",
      "type": "channel.chat.message",
      "version": "1",
      "condition": {
        "broadcaster_user_id": "972045178",
        "user_id": "1183191308"
      },
      "transport": {
        "method": "websocket",
        "session_id": "AgoQIea1KbSRRP-CQ2XlbWk2GhIGY2VsbC1i"
      },
      "created_at": "2025-02-07T20:59:50.66610537Z",
      "cost": 0
    },
    "event": {
      "broadcaster_user_id": "972045178",
      "broadcaster_user_login": "nhancodes",
      "broadcaster_user_name": "nhancodes",
      "source_broadcaster_user_id": null,
      "source_broadcaster_user_login": null,
      "source_broadcaster_user_name": null,
      "chatter_user_id": "972045178",
      "chatter_user_login": "nhancodes",
      "chatter_user_name": "nhancodes",
      "message_id": "e19f7ba5-8c87-4ea3-b668-d4e11b46fe21",
      "source_message_id": null,
      "message": {
        "text": "dd",
        "fragments": [
          {
            "type": "text",
            "text": "dd",
            "cheermote": null,
            "emote": null,
            "mention": null
          }
        ]
      },
      "color": "",
      "badges": [
        {
          "set_id": "broadcaster",
          "id": "1",
          "info": ""
        },
        {
          "set_id": "subscriber",
          "id": "3000",
          "info": "15"
        },
        {
          "set_id": "twitch-recap-2023",
          "id": "1",
          "info": ""
        }
      ],
      "source_badges": null,
      "message_type": "text",
      "cheer": null,
      "reply": null,
      "channel_points_custom_reward_id": null,
      "channel_points_animation_id": null
    }
  }
}
*/