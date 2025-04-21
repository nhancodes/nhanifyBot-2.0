//Session Types
type SessionBase<Status extends string> = {
  status: Status;
  id: string;
  connected_at: string;
  keepalive_timeout_seconds: number;
  reconnect_url: string;
};

//type Session = SessionBase<'reconnecting'> | SessionBase<'connected'>;

//type Session<T extends 'connecting' | 'connected'> = SessionBase<T>;

//Metadata Types
interface MetadataBase {
  message_id: string;
  message_timestamp: string;
}

interface MetadataNotificationMessage extends MetadataBase {
  subscription_type: string;
  subscription_version: string;
}

// Message Types
interface Subscription {
  id: string;
  status: "enabled";
  type: string;
  version: string;
  cost: number;
  created_at: string;
  condition: {
    broadcaster_user_id: string;
    user_id: string;
  };
  transport: { //not in docs
    method: "websocket";
    session_id: string;
  };
};

type MessageBase<MessageType extends string, Metadata, Payload> = {
  message_type: MessageType;
  metadata: Metadata;
  payload: Payload;
};

export type Message = MessageBase<'session_welcome', MetadataBase, { session: SessionBase<'connected'> }> | MessageBase<'session_reconnect', MetadataBase, { session: SessionBase<'reconnecting'> }> | MessageBase<'notification', MetadataNotificationMessage, { subscription: Subscription; event: RewardRedeemEvent }> | MessageBase<'session_keepalive', MetadataBase, {}>;

type SubscriptionBase<SubscriptionType extends string> = {
  subscription_type: SubscriptionType;
};

export interface RewardRedeemEvent extends SubscriptionBase<'channel.channel_points_custom_reward_redemption.add'> {
  broadcaster_name: string;
  broadcaster_login: string;
  user_login: string;
  user_name: string;
  id: string;
  status: string;
  user_input: string;
  reward: {
    id: string,
    title: string,
    cost: number,
  },
}