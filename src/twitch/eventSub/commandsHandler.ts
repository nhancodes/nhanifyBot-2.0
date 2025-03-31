import WebSocket from 'ws';
import { RewardRedeemEvent } from './types.js';
import { playerSkipSong, playerSkipPlaylist } from '../../commands.js';
import { ircCommand } from '../irc/ircCommand.js';
import { Queue } from '../../videoAPI/queue.js';
import { Nhanify } from '../../videoAPI/types.js';
import { rewards } from '../api/reward.js';
export default async function commandsHandler(subscriptionType: string, parsedSubscription: RewardRedeemEvent, ircClient: WebSocket, webSocketServerClients: Set<WebSocket>, nhanifyQueue: Queue, chatQueue: Queue, nhanify: Nhanify) {
    switch (subscriptionType) {
        case "channel.channel_points_custom_reward_redemption.add":
            const title = parsedSubscription.reward.title;
            const chatter = ircCommand.getChatter();
            switch (title) {
                case "NhanifyBot: Skip Song": {
                    //ircClient.send(`PRIVMSG #${auth.TWITCH_CHANNEL} : !skipSong`);
                    await playerSkipSong(webSocketServerClients, ircClient, nhanifyQueue, chatQueue, chatter!, nhanify);
                    const reward = rewards.getRewardById(parsedSubscription.reward.id);
                    if (reward) {
                        const response = await reward.setRedeemStatus(parsedSubscription.id, "FULFILLED");
                        console.log("IN REDEEM_________", response.result);
                        console.log(`Redeem ${response.result.reward.title} was ${response.result.status}.`)
                    }
                    break;
                }
                case "NhanifyBot: Skip Playlist": {
                    playerSkipPlaylist(webSocketServerClients, ircClient, nhanifyQueue, chatter!, chatQueue);
                    const reward = rewards.getRewardById(parsedSubscription.reward.id);
                    if (reward) {
                        const response = await reward.setRedeemStatus(parsedSubscription.id, "FULFILLED");
                        console.log("IN REDEEM_________", response.result);
                        console.log(`Redeem ${response.result.reward.title} was ${response.result.status}.`)
                    }
                    break;
                }
            }
            break;
    }
}