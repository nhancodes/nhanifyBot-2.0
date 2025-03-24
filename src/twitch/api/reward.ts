import auth from '../../auth.json' with {type:'json'};
import { writeFileSync } from 'fs';
import rewardsConfig from './rewards.json' with {type: 'json'};
const {REWARDS} = rewardsConfig;
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
    max_per_stream : number;
    is_max_per_user_per_stream_enabled: boolean;
    max_per_user_per_stream: number;
    is_global_cooldown_enabled: boolean;
    global_cooldown_seconds: number;
}

interface RewardType extends RewardBase {
    max_per_stream_setting: {
        is_enabled: boolean;
        max_per_stream : number;
    };
    max_per_user_per_stream_setting: {
        is_enabled: boolean;
        max_per_user_per_stream : number;
    };
    global_cooldown_setting : {
        is_enabled: boolean;
        global_cooldown_seconds: number;
    }
}

class Rewards {
    constructor (private rewards: Reward[]) {}
    getRewards():RewardType[] {
        return this.rewards.map(reward => {
            console.log("IN GETREWARDS", reward);
            return reward.getReward()})
    }
    getReward(title:string) {
        return this.rewards.find(reward => reward.getTitle() === title);
    }
    addReward(reward: Reward) {
        this.rewards.push(reward);
    }

    async setRewardsIsPause(queueState: string) {
        const  rewardState: Record<string, Record<string, boolean>> = {
            "chat": {
                "NhanifyBot: Skip Playlist": true,
                "NhanifyBot: Skip Song": false,
                "NhanifyBot: Request Song": true,
                "NhanifyBot: Save Song": true
            }, 
            "nhanify": {
                "NhanifyBot: Skip Playlist": true,
                "NhanifyBot: Skip Song": true,
                "NhanifyBot: Request Song": true,
                "NhanifyBot: Save Song": true
            },
            "null": {
                "NhanifyBot: Skip Playlist": false,
                "NhanifyBot: Skip Song": false,
                "NhanifyBot: Request Song": false,
                "NhanifyBot: Save Song": false
            }
        }
        
        const states = rewardState[queueState];
        const updatePromises = [];
        //iterate through the object 
            for (let rewardName in states) {
                // get the reward 
                const reward = rewards.getReward(rewardName);
                if (reward) {
                    const isPaused = states[rewardName];
                    // if the current reward pause state is not the same as the value at reward
                    if(reward.getIsPaused() === isPaused) {
                        // call the api and change state to opposite of valuel at reward 
                        updatePromises.push(reward.setIsPaused(!isPaused));
                    }
                }
            }
        // get all result from promises
        const updatedRewards = await Promise.all(updatePromises);
        updatedRewards.forEach(reward => console.log(`${reward.type}: ${reward.result.title} is ${reward.result.is_paused ? "paused" : "resumed"}`));
        /*const rewards =  titles.map(title => this.getReward(title));
        const promises = rewards.map(reward => reward!.setIsPaused(state));
        const updatedRewards = await Promise.all(promises);
        updatedRewards.forEach(reward => console.log(`${reward.type}: ${reward.result.title} is ${reward.result.is_paused ? "paused" : "resumed"}`));
        */
    }
    
    getJsonConfig() { const REWARDS = this.getRewards().map((reward:RewardType) => {
            console.log("IN CONFIG", reward);
            return {id : reward.id, title : reward.title, cost: reward.cost};
        });
        return {REWARDS};
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
    getIsPaused() {return this.reward.is_paused}

    setReward(reward: RewardType) {
        this.reward = reward;        
    }
    
    async setIsPaused(state: boolean) {
            /*
        const  updateReward = {
            id: this.reward.id, 
            title: this.reward.title, 
            cost: this.reward.cost, 
            prompt: this.reward.prompt,
            background_color: this.reward.background_color,
            is_enabled: this.reward.is_enabled,
            is_user_input_required: this.reward.is_user_input_required,
            is_paused: !this.reward.is_paused,
            should_redemptions_skip_request_queue: this.reward.should_redemptions_skip_request_queue,
            is_max_per_stream_enabled:this.reward.max_per_stream_setting.is_enabled,
            max_per_stream: this.reward.max_per_stream_setting.max_per_stream,
            is_max_per_user_per_stream_enabled: this.reward.max_per_user_per_stream_setting.is_enabled,
            max_per_user_per_stream: this.reward.max_per_user_per_stream_setting.max_per_user_per_stream,
            is_global_cooldown_enabled:this.reward.global_cooldown_setting.is_enabled,
            global_cooldown_seconds: this.reward.global_cooldown_setting.global_cooldown_seconds,
        }; 

            */
        const response = await fetch(
            `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${auth.BROADCASTER_ID}&id=${this.reward.id}`,
            {
                method: 'PATCH',
                headers: {
                    'client-id': auth.CLIENT_ID, 
                    'Authorization': `Bearer ${auth.TWITCH_TOKEN}`,
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({is_paused: state})
            }
        )
        const result = await response.json();
        if (response.ok) {
            this.reward.is_paused = result.data[0].is_paused;
            console.log("IS PAUSED VALUE", this.getIsPaused())
            return {type: "success",result: result.data[0]}
         }else {
            return {type: "error", result};
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
    const result  = await response.json();
    return response.ok ? {type: "success",result: result.data[0]} : {type: "error", result: {reward,result}};
}

async function createReward(reward: ConfigReward) {
    const {title, cost} = reward;
    const response = await fetch(
        `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${auth.BROADCASTER_ID}`,
        {
            method: 'POST',
            headers: {
                'client-id': auth.CLIENT_ID, 
                'Authorization': `Bearer ${auth.TWITCH_TOKEN}`,
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({title, cost})
        }
    )
    const result =  await response.json();
    return response.ok ? {type: "success",result: result.data[0]} : {type: "error", result};
}
type ConfigReward = {id: string; title: string; cost: number}

async function getNhanifyRewards() {
    const promises = REWARDS.map((reward: ConfigReward) => {
        return getRewardFromTwitch(reward);
    });
    const rewardsTwitch = await Promise.all(promises);
    const errors = rewardsTwitch.filter(rewards => rewards.type === "error");
    console.log(`Rewards not found: ${JSON.stringify(errors)}`);
    const createPromises = errors.map(error =>  {
       return createReward(error.result.reward);
    }); 
    const createdRewardsTwitch = await Promise.all(createPromises);
    console.log(`Rewards created: ${JSON.stringify(createdRewardsTwitch)}`);
    const successes = [...rewardsTwitch, ...createdRewardsTwitch].filter(reward => reward.type === "success");
    successes.forEach(success => {
        rewards.addReward(new Reward(success.result))
        console.log(`${success.result.title} reward was added.`)
    });
    if (errors.length > 0) writeFileSync("./src/twitch/api/rewards.json", JSON.stringify(rewards.getJsonConfig()));
}


export { getNhanifyRewards, rewards, Rewards};