
import Config from '../config.json' with {type: 'json'};
export type OnlyBroadcasterType = { [key: string]: boolean };
export type Env = { [key: string]: string };
export type Commands = { [key: string]: Env };
export type NhanifyConfig = { "enabled": boolean, "playlistsById": number[] };
export const config = Config as { "NHANIFY": NhanifyConfig; "VIDEOMAXDURATION": number; "ONLYBROADCASTER": OnlyBroadcasterType; "COMMANDS": Commands };