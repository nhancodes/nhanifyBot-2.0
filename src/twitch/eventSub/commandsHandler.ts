import WebSocket from 'ws';
import { RewardRedeemEvent } from './types.js';
import auth from '../../auth.json' with {type: 'json'};

export default function commandsHandler(subscriptionType: string, parsedSubscription: RewardRedeemEvent, ircClient: WebSocket) {
    switch (subscriptionType) {
        case "channel.channel_points_custom_reward_redemption.add":
            console.log({ subscriptionType, parsedSubscription });
            const title = parsedSubscription.reward.title;
            switch (title) {
                case "NhanifyBot: Skip Song":
                    //ircClient.send(`PRIVMSG #${auth.TWITCH_CHANNEL} : !skipSong`);
                    ircClient.send(`PRIVMSG #${auth.TWITCH_CHANNEL} :!skipSong`);
                    break;
                case "NhanifyBot: Skip Playlist":
                    ircClient.send(`PRIVMSG #${auth.TWITCH_CHANNEL} :!skipPlaylist`);
                    break;
            }
            break;
    }
}