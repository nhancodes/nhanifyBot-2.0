import { WebSocket } from 'ws';
import { isValidURL, getVideoById, parseURL } from '../../videoAPI/youtube/dataAPI.js';
import { ParsedMessage } from './types.js';
import auth from '../../auth.json' with {type: 'json'};
import { Queue } from '../../videoAPI/queue.js';

export async function commandsHandler(parsedMessage: ParsedMessage, client: WebSocket, chatQueue: Queue, webSocketServerClients: Set<WebSocket>, nhanifyQueue: Queue) {
    if (parsedMessage?.command?.type === "botCommand") {
        const chatter = parsedMessage.source?.nick;
        const channel = parsedMessage.command.channel;
        const botCommand = parsedMessage.command.botCommand;
        console.log({ botCommand });
        switch (botCommand) {
            case "bot2sr":
                const url = parsedMessage.command.botCommandParams ? parsedMessage.command.botCommandParams : "";
                try {
                    if (!isValidURL(url)) {
                        return client.send(`PRIVMSG ${channel} : @${chatter}, invalid Youtube video url.`);
                    }
                    const result = await getVideoById(parseURL(url), auth.YT_API_KEY);
                    console.log({ url, result });
                    if (result.id) {
                        chatQueue.add(result);
                        webSocketServerClients.forEach(client => {
                            client.send(JSON.stringify({ action: "add", queue: chatQueue.getQueue() }));
                        });
                        console.log("CURRENT QUEUE", JSON.stringify(chatQueue.getVideos()));
                        return client.send(`PRIVMSG ${channel} : @${chatter}, ${chatQueue.getLast()?.title} added to chat queue.`)
                    }
                    switch (result.restriction) {
                        case "liveStream":
                            client.send(`PRIVMSG ${channel} : @${chatter}, live streams are restricted.`);
                            break;
                        case "age":
                            client.send(`PRIVMSG ${channel} : @${chatter}, video is age restricted.`);
                            break;
                        case "region":
                            client.send(`PRIVMSG ${channel} : @${chatter}, video is restricted in the US.`);
                            break;
                        case "notEmbeddable":
                            client.send(`PRIVMSG ${channel} : @${chatter}, video can't be played on embedded player.`);
                            break;
                        case "duration":
                            client.send(`PRIVMSG ${channel} : @${chatter}, video duration can't be over 10 minutes.`);
                            break;
                        default:
                            client.send(`PRIVMSG ${channel} : @${chatter}, video does not exist. `);
                    }
                } catch (error) {
                    console.log(error);
                }
            case "bot2resume":
            case "bot2pause":
                webSocketServerClients.forEach(client => {
                    client.send(JSON.stringify({ action: botCommand, queue: null }));
                });
                break;
            case "bot2skipSong":
                console.log("CURRENTLY PLAYING", Queue.getPlayingOn());
                console.log({ nhanifyQueue });
                if (Queue.getPlayingOn() === null) return client.send(`PRIVMSG ${channel} : @${chatter}, all queues are empty.`);
                Queue.getPlayingOn() === 'nhanify' ? nhanifyQueue.remove() : chatQueue.remove()
                if (!chatQueue.isEmpty()) {
                    Queue.setPlayingOn("chat");
                    webSocketServerClients.forEach(client => {
                        client.send(JSON.stringify({ action: "play", queue: chatQueue.getQueue() }));
                    });
                } else if (!nhanifyQueue.isEmpty()) {
                    Queue.setPlayingOn("nhanify");
                    webSocketServerClients.forEach(client => {
                        client.send(JSON.stringify({ action: "play", queue: nhanifyQueue.getQueue() }));
                    });
                } else {
                    Queue.setPlayingOn(null);
                    webSocketServerClients.forEach(client => {
                        client.send(JSON.stringify({ action: "emptyQueues", queue: null }));
                    });
                }
                break;
            case "bot2skipPlaylist":
        }
    }
}