import WebSocket from 'ws';
import { RewardRedeemEvent } from './types.js';
import { playerSkipSong, playerSkipPlaylist } from '../../commands.js';
import { ircCommand } from '../irc/ircCommand.js';
import { Queue } from '../../videoAPI/queue.js';
export default function commandsHandler(subscriptionType: string, parsedSubscription: RewardRedeemEvent, ircClient: WebSocket, webSocketServerClients: Set<WebSocket>, nhanifyQueue: Queue, chatQueue: Queue) {
    switch (subscriptionType) {
        case "channel.channel_points_custom_reward_redemption.add":
            console.log({ subscriptionType, parsedSubscription });
            const title = parsedSubscription.reward.title;
            const chatter = ircCommand.getChatter();
            switch (title) {
                case "NhanifyBot: Skip Song":
                    //ircClient.send(`PRIVMSG #${auth.TWITCH_CHANNEL} : !skipSong`);
                    playerSkipSong(webSocketServerClients, ircClient, nhanifyQueue, chatQueue, chatter!);
                    break;
                case "NhanifyBot: Skip Playlist":
                    playerSkipPlaylist(webSocketServerClients, ircClient, nhanifyQueue, chatter!);
                    break;
            }
            break;
    }
}