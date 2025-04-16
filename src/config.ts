
//import Config from '../config.json' with {type: 'json'};
import { readFileSync } from "fs";
export type OnlyBroadcasterType = { [key: string]: boolean };
export type Commands = { [key: string]: string };
export type NhanifyConfig = { "enabled": boolean, "playlistsById": number[] };
type RewardsConfig = { id: string, title: string, cost: number, isPausedStates: State };
type State = { [key: string]: boolean };
type Config = { "NHANIFY": NhanifyConfig; "VIDEO_MAX_DURATION": number; "ONLY_BROADCASTER": OnlyBroadcasterType; "COMMANDS": Commands; REWARDS: RewardsConfig[] };
export let filePath: string = "config.json";

if (typeof process.argv[2] === 'string') filePath = process.argv[2].split("=")[1];// --file=config.json 

export const config: Config = JSON.parse(
    readFileSync(filePath, "utf-8")
);