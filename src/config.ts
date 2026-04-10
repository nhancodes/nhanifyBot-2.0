//import Config from '../config.json' with {type: 'json'};
import { readFileSync } from "fs";
import path from 'path';
import { fileURLToPath } from 'url';
// recreate __filename and __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename)
export type OnlyBroadcasterType = { [key: string]: boolean };
export type Commands = { [key: string]: string };
export type NhanifyConfig = { "enabled": boolean, "playlistsById": number[] };
type RewardsConfig = { id: string, title: string, cost: number, isPausedStates: State };
type State = { [key: string]: boolean };
type Config = {
    "BOT": {
        "NHANIFY": NhanifyConfig;
        "VIDEO_MAX_DURATION": number;
        "ONLY_BROADCASTER": OnlyBroadcasterType;
        "COMMANDS": Commands; REWARDS: RewardsConfig[]
    },
    "AUTH": {
        "BOT_TWITCH_TOKEN": string,
        "BOT_REFRESH_TWITCH_TOKEN": string,
        "BROADCASTER_REFRESH_TWITCH_TOKEN": string,
        "BROADCASTER_TWITCH_TOKEN": string,
        "WEB_SERVER_PORT": string,
        "BOT_ID": string,
        "BROADCASTER_ID": string,
        "CLIENT_SECRET": string,
        "BROADCASTER_NAME": string,
        "BOT_NAME": string,
        "CLIENT_ID": string,
        "NHANIFY_API_KEY": string,
        "YT_API_KEY": string,
        "NHANIFY_ID": string,
        "NHANIFY_URL": string,
        "ENV": string,
        "EVENTSUB_HOST": string
    }
};
export let filePath: string = "config.json";

if (typeof process.argv[2] === 'string') filePath = process.argv[2].split("=")[1];// --file=config.json 
const authPath = filePath === 'config.json' ? path.join(__dirname, 'auth.json') : path.join(__dirname, 'auth.dev.json');
const bot = JSON.parse(readFileSync(filePath, "utf-8"));
const auth = JSON.parse(readFileSync(authPath, "utf-8"));
export const config: Config = { BOT: bot, AUTH: auth };