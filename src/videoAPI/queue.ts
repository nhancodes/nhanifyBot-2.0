import type { YTVideo, ChatQueue, NhanifyQueue } from './types.js';
type QueueType = "nhanify" | "chat" | null;
export class Queue {
    private queue: ChatQueue | NhanifyQueue;
    private static playingOn: QueueType;
    private static isPlaying: boolean = true;
    constructor(queue: ChatQueue | NhanifyQueue) {
        this.queue = queue;
        this.queue.length = this.queue.videos.length;
    }
    static getIsPlaying(): boolean {
        return Queue.isPlaying;
    }
    static toggleIsPlaying(): void {
        Queue.isPlaying = !Queue.isPlaying;
    }
    static setPlayingOn(queueName: QueueType): void {
        Queue.playingOn = queueName;
    }
    static getPlayingOn(): QueueType {
        return Queue.playingOn;
    }
    nextQueue(queue: NhanifyQueue) {
        this.queue = queue;
        this.queue.length = queue.videos.length;
    }
    getQueue(): NhanifyQueue | ChatQueue {
        return this.queue;
    }
    getVideos(): YTVideo[] {
        return this.queue.videos;
    }
    add(video: YTVideo): void {
        this.queue.videos.push(video);
    }
    remove(): void {
        this.queue.videos.shift();
    }
    isEmpty(): boolean {
        return this.queue.videos.length === 0;
    }
    getFirst(): YTVideo | null {
        if (this.isEmpty()) return null;
        return this.queue.videos[0];
    }
    getLast(): YTVideo | null {
        if (this.isEmpty()) return null;
        return this.queue.videos[this.queue.videos.length - 1];
    }
}

export const savedVideos: { [key: string]: string[] } = {};

export { ChatQueue };
