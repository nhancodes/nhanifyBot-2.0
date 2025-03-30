import auth from '../../auth.json' with {type: 'json'};
import { writeFileSync } from 'fs';
import rewardsConfig from './rewards.json' with {type: 'json'};
import { RewardRedeemEvent } from '../eventSub/types.js';
type RewardJson = { id: string, title: string, cost: number, isPausedStates: State };
type State = { [key: string]: boolean };
const REWARDS = rewardsConfig.REWARDS as RewardJson[];

function transformRewardsState(): { [key: string]: State } {
    const queueStates = ["chat", "nhanify", "null"];
    const result: { [key: string]: State } = {};
    queueStates.forEach(queueState => {
        const state: State = {};
        REWARDS.forEach(reward => {
            state[reward.title] = reward.isPausedStates[queueState];
        });
        result[queueState] = state;
    })
    return result;
}
const isPausedStates: { [key: string]: State } = transformRewardsState();
interface RewardBase {
    id: string;
    title: string;
    cost: number;
    prompt: boolean;
    background_color: string;
    is_enabled: boolean;
    is_user_input_required: boolean;
    is_paused: boolean;
    should_redemptions_skip_request_queue: boolean
}
interface RewardUpate extends RewardBase {
    is_max_per_stream_enabled: boolean;
    max_per_stream: number;
    is_max_per_user_per_stream_enabled: boolean;
    max_per_user_per_stream: number;
    is_global_cooldown_enabled: boolean;
    global_cooldown_seconds: number;
}

interface RewardType extends RewardBase {
    max_per_stream_setting: {
        is_enabled: boolean;
        max_per_stream: number;
    };
    max_per_user_per_stream_setting: {
        is_enabled: boolean;
        max_per_user_per_stream: number;
    };
    global_cooldown_setting: {
        is_enabled: boolean;
        global_cooldown_seconds: number;
    }
}

class Rewards {
    constructor(private rewards: Reward[]) { }
    getRewards(): RewardType[] {
        return this.rewards.map(reward => {
            return reward.getReward()
        })
    }

    getRewardByTitle(title: string) {
        return this.rewards.find(reward => reward.getTitle() === title);
    }

    getRewardById(id: string) {
        return this.rewards.find(reward => reward.getId() === id);
    }

    addReward(reward: Reward) {
        this.rewards.push(reward);
    }

    async setRewardsIsPause(queueState: string) {
        const states = isPausedStates[queueState];
        const updatePromises = [];
        for (let rewardName in states) {
            const reward = rewards.getRewardByTitle(rewardName);
            if (reward) {
                const isPaused = states[rewardName];
                if (reward.getIsPaused() !== isPaused) {
                    updatePromises.push(reward.setIsPaused(isPaused));
                }
            }
        }
        // get all result from promises
        const updatedRewards = await Promise.all(updatePromises);
        updatedRewards.forEach(reward => {
            if (reward.type === "success") {
                console.log(`${reward.type}: ${reward.result.title} is ${reward.result.is_paused ? "paused" : "resumed"}`)
            } else {
                console.log(`${reward.type}: ${reward.result.error}`);
            }
        });
    }

    getJsonConfig() {
        const result = this.getRewards().map((reward: RewardType) => {
            const rewardFound = REWARDS.find(rewardConfig => rewardConfig.title === reward.title);
            return { id: reward.id, title: reward.title, cost: reward.cost, isPausedStates: rewardFound?.isPausedStates };
        });
        return { REWARDS: result };
    }
}

class Reward {
    reward: RewardType;
    constructor(reward: RewardType) {
        this.reward = reward;
    }
    getReward() {
        return this.reward;
    }
    getTitle() {
        return this.reward.title;
    }
    getId() {
        return this.reward.id;
    }
    getCost() {
        return this.reward.cost;
    }
    getIsPaused() { return this.reward.is_paused }

    setReward(reward: RewardType) {
        this.reward = reward;
    }

    async setRedeemStatus(redeemId: string, status: "CANCELED" | "FULFILLED" | "UNFULFILLED") {
        const response = await fetch(
            `https://api.twitch.tv/helix/channel_points/custom_rewards/redemptions?broadcaster_id=${auth.BROADCASTER_ID}&reward_id=${this.reward.id}&id=${redeemId}`,
            {
                method: 'PATCH',
                headers: {
                    'client-id': auth.CLIENT_ID,
                    'Authorization': `Bearer ${auth.TWITCH_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status})
            }
        )
        const result = await response.json();
        if (response.ok) {
            return { type: "success", result: result.data[0] }
        } else {
            return { type: "error", result };
        }
    }

    async setIsPaused(state: boolean) {
        const response = await fetch(
            `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${auth.BROADCASTER_ID}&id=${this.reward.id}`,
            {
                method: 'PATCH',
                headers: {
                    'client-id': auth.CLIENT_ID,
                    'Authorization': `Bearer ${auth.TWITCH_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_paused: state })
            }
        )
        const result = await response.json();
        if (response.ok) {
            this.reward.is_paused = result.data[0].is_paused;
            return { type: "success", result: result.data[0] }
        } else {
            return { type: "error", result };
        }
    }
}

const rewards = new Rewards([]);

async function getRewardFromTwitch(reward: ConfigReward) {
    const response = await fetch(
        `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${auth.BROADCASTER_ID}&id=${reward.id}`,
        {
            headers: {
                'client-id': auth.CLIENT_ID,
                'Authorization': `Bearer ${auth.TWITCH_TOKEN}`,
            }

        }
    )
    const result = await response.json();
    return response.ok ? { type: "success", result: result.data[0] } : { type: "error", result: { reward, result } };
}

async function createReward(reward: ConfigReward) {
    const { title, cost } = reward;
    const response = await fetch(
        `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${auth.BROADCASTER_ID}`,
        {
            method: 'POST',
            headers: {
                'client-id': auth.CLIENT_ID,
                'Authorization': `Bearer ${auth.TWITCH_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title,
                cost,
                background_color: "#19376d",
                is_global_cooldown_enabled: true,
                global_cooldown_seconds: 30
            })
        }
    )
    const result = await response.json();
    return response.ok ? { type: "success", result: result.data[0] } : { type: "error", result };
}

type ConfigReward = { id: string; title: string; cost: number }

async function getNhanifyRewards() {
    const promises = REWARDS.map((reward: ConfigReward) => {
        return getRewardFromTwitch(reward);
    });
    const rewardsTwitch = await Promise.all(promises);
    const errors = rewardsTwitch.filter(rewards => rewards.type === "error");
    const foundSuccesses = rewardsTwitch.filter(rewards => rewards.type === "success");
    rewardsTwitch.forEach(response => {
        if (response.type === "error") {
            console.log(`${response.result.reward.title} reward not found.`)
        } else if (response.type === "success") {
            console.log(`${response.result.title} reward found.`)
        }
    });
    const createPromises = errors.map(error => {
        return createReward(error.result.reward);
    });
    const createdRewardsTwitch = await Promise.all(createPromises);
    createdRewardsTwitch.forEach(response => {
        if (response.type === "error") {
            console.log(`${response.result.title} reward not created.`)
        } else if (response.type === "success") {
            console.log(`${response.result.title} reward created.`)
        }
    });
    const createdSuccesses = [...foundSuccesses, ...createdRewardsTwitch].filter(reward => reward.type === "success");
    createdSuccesses.forEach(success => {
        rewards.addReward(new Reward(success.result))
        console.log(`${success.result.title} reward instance was created and added to rewards class.`)
    });
    if (errors.length > 0) writeFileSync("./src/twitch/api/rewards.json", JSON.stringify(rewards.getJsonConfig()));
}


export { getNhanifyRewards, rewards, Rewards };