
export type OnlyBroadcasterType = { [key: string]: boolean };
export type Env = { [key: string]: string };
export type Commands = { [key: string]: Env };
export type NhanifyConfig = { "enabled": boolean, "playlistsById": number[] };