import { YTVideo, ChatQueue, NhanifyQueue } from './types.js';
export class Queue {
    public queue: ChatQueue | NhanifyQueue;
    constructor(queue: ChatQueue | NhanifyQueue) {
        this.queue = queue;
    }
    getQueue(): YTVideo[] {
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
}