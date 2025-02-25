import { WebSocket, WebSocketServer } from 'ws';
import { isValidURL, getVideo } from '../../videoAPI/youtube/dataAPI.js';
import { VideoError } from '../../videoAPI/types.js';
import { ParsedMessage } from './types.js';
import auth from '../../auth.json' with {type: 'json'};
import { Queue } from '../../videoAPI/queue.js';

export async function commandsHandler(parsedMessage: ParsedMessage, client: WebSocket, chatQueue: Queue, webSocketServerClients: Set<WebSocket>) {
    if (parsedMessage?.command?.type === "botCommand") {
        const chatter = parsedMessage.source?.nick;
        const channel = parsedMessage.command.channel;
        switch (parsedMessage.command.botCommand) {
            case "songrequest":
                const url = parsedMessage.command.botCommandParams;
                if (url) {
                    try {
                        if (!isValidURL(url)) {
                            client.send(`PRIVMSG ${channel} : @${chatter}, invalid Youtube video url.`);
                        }
                        const video = await getVideo(url, auth.YT_API_KEY);
                        chatQueue.add(video);
                        const lastVideo = chatQueue.getLast();
                        const videos = chatQueue.getVideos();
                        console.log("__________________", JSON.stringify(videos));
                        let msg;
                        if (lastVideo) {
                            msg = `${lastVideo.title}" added to chat queue.`;
                            webSocketServerClients.forEach(client => {
                                client.send(JSON.stringify({ action: "add", queue: chatQueue.getQueue() }));
                            });
                        } else {
                            msg = `invalid youtube url.`;
                        }
                        client.send(`PRIVMSG ${channel} : @${chatter}, ${msg} `)
                        return;
                    } catch (error) {
                        if (error instanceof TypeError) {
                            if (error.message === "Invalid URL") {
                                client.send(`PRIVMSG ${channel} : @${chatter}, invalid url.`);
                            }
                        } else if (error instanceof VideoError) {
                            switch (error.message) {
                                case "liveStreamRestriction":
                                    client.send(`PRIVMSG ${channel} : @${chatter}, live streams are restricted.`);
                                    break;
                                case "ageRestriction":
                                    client.send(`PRIVMSG ${channel} : @${chatter}, video is age restricted.`);
                                    break;
                                case "regionRestriction":
                                    client.send(`PRIVMSG ${channel} : @${chatter}, video is age restricted in the US.`);
                                    break;
                                case "notEmbeddable":
                                    client.send(`PRIVMSG ${channel} : @${chatter}, video can't be played on embedded player.`);
                                    break;
                                case "durationRestriction":
                                    client.send(`PRIVMSG ${channel} : @${chatter}, video duration can't be over 10 minutes.`);
                                    break;
                                default:
                                    client.send(`PRIVMSG ${channel} : @${chatter}, sorry, something went wrong with the request.`);
                                    console.error(error);
                            }
                        }
                    }
                } else {
                    client.send(`PRIVMSG ${channel} : @${chatter}, no url provided.`);
                }
        }
    }
}