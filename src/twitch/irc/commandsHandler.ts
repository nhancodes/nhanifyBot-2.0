import { WebSocket } from 'ws';
import { ParsedMessage } from './types.js';
import auth from '../../auth.json' with {type: 'json'};
import { Queue } from '../../videoAPI/queue.js';
import { Nhanify } from '../../videoAPI/types.js';
import { Rewards } from '../api/reward.js';
import { playerRequestSong, playerSkipPlaylist, playerSkipSong } from '../../commands.js';
import { ircCommand } from './ircCommand.js';
import { config } from '../../config.js'
const { ONLY_BROADCASTER, COMMANDS } = config;
export async function commandsHandler(parsedMessage: ParsedMessage, client: WebSocket, chatQueue: Queue, webSocketServerClients: Set<WebSocket>, nhanifyQueue: Queue, nhanify: Nhanify, rewards: Rewards) {
    if (parsedMessage?.command?.type === "botCommand") {
        const chatter = parsedMessage.source?.nick;
        const channel = parsedMessage.command.channel;
        const botCommand = parsedMessage.command.botCommand;
        // Find the key that matches the botCommand
        const commandKey = Object.keys(COMMANDS).find(
            key => COMMANDS[key] === botCommand
        )
        if (chatter) ircCommand.setChatter(chatter);
        switch (commandKey) {
            case "playlist":
                if (Queue.getPlayingOn() === "nhanify" && Queue.getIsPlaying()) {
                    const id = nhanifyQueue.getQueue().id;
                    client.send(`PRIVMSG ${channel} : @${chatter}, ${auth.NHANIFY_URL}/public/playlists/1/playlist/1/${id}`);
                } else {
                    client.send(`PRIVMSG ${channel} : @${chatter}, no playlist from Nhanify is currently playing.`);
                }
                break;
            case "aboutNhanify":
                client.send(`PRIVMSG ${channel} : @${chatter}, https://www.youtube.com/shorts/d6Uwh81MoKM`);
                break;
            case "commands":
                const chatCommands = Object.entries(COMMANDS).filter(command => !ONLY_BROADCASTER[command[0]]);
                const formattedCommands = chatCommands.map(command => `${command[0]}: !${command[1]}`).join(" | ");
                client.send(`PRIVMSG ${channel} : @${chatter}, ${formattedCommands}`);
                break;
            case "songRequest":
                if (ONLY_BROADCASTER.songRequest) {
                    if (chatter !== auth.BROADCASTER_NAME) return client.send(`PRIVMSG ${channel} : @${chatter}, command can only be use by the boardcaster.`);
                }
                const url = parsedMessage.command.botCommandParams ? parsedMessage.command.botCommandParams : "";
                playerRequestSong(webSocketServerClients, client, chatQueue, chatter!, url);
                break;
            case "resumeSong":
                if (ONLY_BROADCASTER.resumeSong) {
                    if (chatter !== auth.BROADCASTER_NAME) return client.send(`PRIVMSG ${channel} : @${chatter}, command can only be use by the broadcaster.`);
                }
                if (Queue.getIsPlaying()) break;
                Queue.toggleIsPlaying();
                await rewards.setRewardsIsPause("nhanify");
                // call the twitch api to pause redeemsgtgt
                webSocketServerClients.forEach(client => {
                    client.send(JSON.stringify({ action: commandKey, queue: null }));
                });
                break;
            case "pauseSong":
                if (ONLY_BROADCASTER.pauseSong) {
                    if (chatter !== auth.BROADCASTER_NAME) return client.send(`PRIVMSG ${channel} : @${chatter}, command can only be use by the broadcaster.`);
                }
                if (!Queue.getIsPlaying()) break;
                Queue.toggleIsPlaying();
                await rewards.setRewardsIsPause("null");
                // call the twitch api to pause redeemsgtgt
                webSocketServerClients.forEach(client => {
                    client.send(JSON.stringify({ action: commandKey, queue: null }));
                });
                break;
            case "skipSong":
                if (ONLY_BROADCASTER.skipSong) {
                    if (chatter !== auth.BROADCASTER_NAME) return client.send(`PRIVMSG ${channel} : @${chatter}, command can only be use by the broadcaster.`);
                }
                playerSkipSong(webSocketServerClients, client, nhanifyQueue, chatQueue, chatter!, nhanify);
                break;
            case "playingSong":
                if (ONLY_BROADCASTER.song) {
                    if (chatter !== auth.BROADCASTER_NAME) return client.send(`PRIVMSG ${channel} : @${chatter}, command can only be use by the broadcaster.`);
                }
                if (Queue.getPlayingOn() === null) return client.send(`PRIVMSG ${channel} : @${chatter}, No song is currently playing.`);
                const video = Queue.getPlayingOn() === "nhanify" ? nhanifyQueue.getFirst() : chatQueue.getFirst();
                const msg = Queue.getIsPlaying() ? `${video?.title} -> https://www.youtube.com/watch?v=${video?.videoId}` : `No song is currently playing.`;
                client.send(`PRIVMSG ${channel} : @${chatter}, ${msg}`);
                break;
            case "skipPlaylist":
                if (ONLY_BROADCASTER.skipPlaylist) {
                    if (chatter !== auth.BROADCASTER_NAME) return client.send(`PRIVMSG ${channel} : @${chatter}, command can only be use by the boardcaster.`);
                }
                playerSkipPlaylist(webSocketServerClients, client, nhanifyQueue, chatter!, chatQueue);
                break;
            case "saveSong": {
                if (ONLY_BROADCASTER.saveSong) {
                    if (chatter !== auth.BROADCASTER_NAME) return client.send(`PRIVMSG ${channel} : @${chatter}, command can only be use by the boardcaster.`);
                }
            }
        }
    }
}