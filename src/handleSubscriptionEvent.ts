import { ChannelChatMessageEvent } from './types/twitch/index.js';
import sendChatMessage from './twitchChat.js';

export default function handleSubscriptionEvent(subscriptionType: string, parsedSubscription: ChannelChatMessageEvent) {
    switch (subscriptionType) {
        case 'channel.chat.message':
            console.log(`MSG #${parsedSubscription.broadcaster_user_login} <${parsedSubscription.chatter_user_login}> ${parsedSubscription.message.text}`);
            const cleaned = parsedSubscription.message.text.normalize("NFKC").replace(/\uDB40\uDC00/g, "").trim();
            if (cleaned === "test") sendChatMessage("it works")
            break;
    }
}