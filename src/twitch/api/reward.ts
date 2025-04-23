import auth from '../../auth.json' with {type: 'json'};
import { writeFileSync } from 'fs';
import { config, filePath } from '../../config.js';
import { authenticateTwitchToken, isAuthResultSuccess } from '../auth.js';
type State = { [key: string]: boolean };

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
type ErrorResponse = {
  message: string;
  status?: number;
}
type ConfigReward = { id: string; title: string; cost: number };
type RewardResponse = { type: "data", data: RewardType } | { type: "error", error: { reward: ConfigReward, response: ErrorResponse } };

function transformRewardsState(): { [key: string]: State } {
  const queueStates = ["chat", "nhanify", "null"];
  const result: { [key: string]: State } = {};
  queueStates.forEach(queueState => {
    const state: State = {};
    config.REWARDS.forEach(reward => {
      state[reward.title] = reward.isPausedStates[queueState];
    });
    result[queueState] = state;
  })
  return result;
}
const isPausedStates: { [key: string]: State } = transformRewardsState();
//console.log({isPausedStates});


async function getNhanifyRewards() {
  const promises = config.REWARDS.map((reward: ConfigReward) => {
    return getRewardFromTwitch(reward);
  });
  const rewardsResponses = await Promise.all(promises);
  rewardsResponses.forEach(response => {
    if (response.type === "error") console.log(`${response.error.reward.title}: ${response.error.response.message}`)
    if (response.type === "data") console.log(`${response.data.title} reward found.`)
  });
  const errorResponses = rewardsResponses.filter(response => response.type === "error");
  const foundResponses = rewardsResponses.filter(response => response.type === "data");
  const createPromises = errorResponses.map(response => {
    return createReward(response.error.reward);
  });
  const createdRewardsResponses = await Promise.all(createPromises);
  createdRewardsResponses.forEach(response => {
    if (response.type === "error") console.log(`${response.error.reward.title}: ${response.error.response.message}`)
    if (response.type === "data") console.log(`${response.data.title} reward found.`)
  });
  const foundCreatedRewards = [...foundResponses, ...createdRewardsResponses].filter(response => response.type === "data");
  foundCreatedRewards.forEach(reward => {
    rewards.addReward(new Reward(reward.data))
    const addedReward = rewards.getRewardByTitle(reward.data.title);
    addedReward ? console.log(`${addedReward.getTitle()} reward instance was created and added to rewards.`) : console.log(`${reward.data.title} reward instance was NOT created and added to rewards.`);
  });

  //update the config json
  const rewardsConfig = rewards.getJsonConfig();

  const updatedConfig = { ...config, REWARDS: rewardsConfig };
  if (createdRewardsResponses.length > 0) {
    console.log("Wrote new rewards to config.json");
    if (filePath === "config.json") return writeFileSync("./config.json", JSON.stringify(updatedConfig));
    return writeFileSync("./config.dev.json", JSON.stringify(updatedConfig, null, 4));
  }
  console.log("No new rewards to write to config.json");
}

async function getRewardFromTwitch(reward: ConfigReward): Promise<RewardResponse> {
  try {
    const response = await fetch(
      `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${auth.BROADCASTER_ID}&id=${reward.id}`,
      {
        headers: {
          'client-id': auth.CLIENT_ID,
          'Authorization': `Bearer ${auth.BROADCASTER_TWITCH_TOKEN}`,
        }
      }
    )
    const data = await response.json();
    return response.ok ? { type: "data", data: data.data[0] } : { type: "error", error: { response: data, reward } };
  } catch (e) {
    return { type: "error", error: { reward, response: { message: `Get Twitch reward error: ${JSON.stringify(e)}` } } };
  }
}

async function createReward(reward: ConfigReward): Promise<RewardResponse> {
  try {
    const { title, cost } = reward;
    //title is Song request 
    const body = {
      is_user_input_required: false,
      prompt: "",
      title,
      cost,
      background_color: "#19376d",
      is_global_cooldown_enabled: true,
      global_cooldown_seconds: 10
    };
    if (reward.title === config.REWARDS[2].title) {
      body.is_user_input_required = true;
      body.prompt = "Enter a valid youtube url.";
    }
    const response = await fetch(
      `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${auth.BROADCASTER_ID}`,
      {
        method: 'POST',
        headers: {
          'client-id': auth.CLIENT_ID,
          'Authorization': `Bearer ${auth.BROADCASTER_TWITCH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    )
    const data = await response.json();
    return response.ok ? { type: "data", data: data.data[0] } : { type: "error", error: { reward, response: data } };
  } catch (e) {
    return { type: "error", error: { reward, response: { message: JSON.stringify(e) } } };
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
    console.log({ queueState, states });
    const updatePromises = [];
    for (let rewardName in states) {
      const reward = rewards.getRewardByTitle(rewardName);
      //console.log({reward});
      if (reward) {
        const isPaused = states[rewardName];
        //console.log(`${reward.getTitle()} is currently ${reward.getIsPaused()} and but it needs to be ${isPaused}`);
        if (reward.getIsPaused() !== isPaused) {
          const result = await reward.setIsPaused(isPaused);
          if (result.type === "data") {
            reward.setReward(result.data);
            //console.log(`${reward.getTitle()} is now currently after setIsPaused: ${reward.getIsPaused()} and but it needs to be ${isPaused}`);
            updatePromises.push(result.data);
          } else if (result.error.status === 401) {
            if (!isAuthResultSuccess(await authenticateTwitchToken('broadcaster'))) return;
            const result = await reward.setIsPaused(isPaused);
            if (result.type === "data") {
              reward.setReward(result.data);
              updatePromises.push(result.data);
            }
          }
        }
      }
    }
    // get all result from promises
    const updatedRewards = await Promise.all(updatePromises);
    //console.log({updatedRewards});
    if (updatedRewards.length === 0) return console.log("No rewards has changed.");
    updatedRewards.forEach(reward => console.log(`${reward.title} reward was ${reward.is_paused ? "paused" : "resumed"}.`));
  }

  getJsonConfig() {
    return this.getRewards().map((reward: RewardType) => {
      const rewardFound = config.REWARDS.find(rewardConfig => rewardConfig.title === reward.title);
      return { id: reward.id, title: reward.title, cost: reward.cost, isPausedStates: rewardFound?.isPausedStates };
    });
  }
}

const rewards = new Rewards([]);

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
          'Authorization': `Bearer ${auth.BROADCASTER_TWITCH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      }
    )
    const result = await response.json();
    if (response.ok) {
      return { type: "success", result: result.data[0] }
    } else if (response.status === 401) {
      await authenticateTwitchToken('broadcaster');
    } else {
      return { type: "error", result };
    }
  }

  async setIsPaused(state: boolean): Promise<{ type: "data", data: RewardType } | { type: "error", error: { status?: number, message?: string } }> {
    try {
      const response = await fetch(
        `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${auth.BROADCASTER_ID}&id=${this.reward.id}`,
        {
          method: 'PATCH',
          headers: {
            'client-id': auth.CLIENT_ID, // the application - sitting the nhanybot 
            'Authorization': `Bearer ${auth.BROADCASTER_TWITCH_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ is_paused: state })
        }
      )
      //console.log(response.status)
      const data = await response.json();
      if (!response.ok) console.log(`setIsPausedResponse: ${data}`);
      return response.ok ? { type: "data", data: data.data[0] } : { type: "error", error: { status: response.status } };
    } catch (e) {
      return { type: "error", error: { message: `Twitch setIsPaused error: ${JSON.stringify(e)}` } };
    }
  }
}


export { getNhanifyRewards, rewards, Rewards };