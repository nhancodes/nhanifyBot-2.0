import WebSocket from 'ws';
import { RewardRedeemEvent } from './types.js';
import { playerSkipSong, playerSkipPlaylist, playerRequestSong, playerSaveSong } from '../../commands.js';
import { ircCommand } from '../irc/ircCommand.js';
import { Queue } from '../../videoAPI/queue.js';
import { Nhanify } from '../../videoAPI/types.js';
import { rewards } from '../api/reward.js';
import { config } from '../../config.js'
export default async function commandsHandler(subscriptionType: string, parsedSubscription: RewardRedeemEvent, ircClient: WebSocket, webSocketServerClients: Set<WebSocket>, nhanifyQueue: Queue, chatQueue: Queue, nhanify: Nhanify) {
    const { user_input, user_name } = parsedSubscription;
    //console.log(subscriptionType);
    switch (subscriptionType) {
        case "channel.channel_points_custom_reward_redemption.add":
            const title = parsedSubscription.reward.title;
            //const chatter = ircCommand.getChatter();
            const chatter = parsedSubscription.user_name;
            switch (title) {
                case config.REWARDS[0].title: {
                    await playerSkipSong(webSocketServerClients, ircClient, nhanifyQueue, chatQueue, chatter, nhanify);
                    const reward = rewards.getRewardById(parsedSubscription.reward.id);
                    if (reward) {
                        const response = await reward.setRedeemStatus(parsedSubscription.id, "FULFILLED");
                        if (response!.type === "success") {
                            console.log(`Redeem ${response!.result.reward.title} was ${response!.result.status}.`)
                        }
                    }
                    break;
                }
                case config.REWARDS[1].title: {
                    await playerSkipPlaylist(webSocketServerClients, ircClient, nhanifyQueue, chatter, chatQueue);
                    const reward = rewards.getRewardById(parsedSubscription.reward.id);
                    if (reward) {
                        const response = await reward.setRedeemStatus(parsedSubscription.id, "FULFILLED");
                        if (response!.type === "success") {
                            console.log(`Redeem ${response!.result.reward.title} was ${response!.result.status}.`)
                        }
                    }
                    break;
                }
                case config.REWARDS[2].title: {
                    await playerRequestSong(webSocketServerClients, ircClient, chatQueue, chatter, user_input);
                    const reward = rewards.getRewardById(parsedSubscription.reward.id);
                    if (reward) {
                        const response = await reward.setRedeemStatus(parsedSubscription.id, "FULFILLED");
                        if (response!.type === "success") {
                            console.log(`Redeem ${response!.result.reward.title} was ${response!.result.status}.`)
                        }
                    }
                    break;
                }
                case config.REWARDS[3].title: {
                    await playerSaveSong(chatter, ircClient, nhanifyQueue, chatQueue);
                    const reward = rewards.getRewardById(parsedSubscription.reward.id);
                    if (reward) {
                        const response = await reward.setRedeemStatus(parsedSubscription.id, "FULFILLED");
                        if (response!.type === "success") {
                            console.log(`Redeem ${response!.result.reward.title} was ${response!.result.status}.`)
                        }
                    }
                    break;
                }
            }
            break;
    }
}