import WebSocket from 'ws';
import {RewardRedeemEvent} from './types.js';
import auth from '../../auth.json' with {type: 'json'};

export default function commandsHandler(subscriptionType: string, parsedSubscription: RewardRedeemEvent, ircClient: WebSocket) {
    switch (subscriptionType) {
        /*case 'channel.chat.message':
            console.log(`MSG #${parsedSubscription.broadcaster_user_login} <${parsedSubscription.chatter_user_login}> ${parsedSubscription.message.text}`);
            const cleaned = parsedSubscription.message.text.normalize("NFKC").replace(/\uDB40\uDC00/g, "").trim();
            if (cleaned === "test") sendChatMessage("it works")
        */
        case "channel.channel_points_custom_reward_redemption.add":
            console.log({subscriptionType, parsedSubscription});
            const title = parsedSubscription.reward.title;
            switch(title) {
                case "Skip Song":
                    ircClient.send(`PRIVMSG #${auth.TWITCH_CHANNEL} : ${title} was redeemed.`);
                    break;
                case "Skip Playlist":
                    ircClient.send(`PRIVMSG #${auth.TWITCH_CHANNEL} : ${title} was redeemed.`);
                    break;
            }
        break;
    }
}