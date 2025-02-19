import {YTVideo} from './types.js' with {type: 'JSON'};
const queue : YTVideo [] = [];
export const chatQueue = {
    getQueue():YTVideo [] {
        return queue;
    },
    add(video: YTVideo):void {
        queue.push(video);
    },
    remove():void {
        queue.shift();
    },
    isEmpty():boolean {
        return queue.length === 0;
    },
    getFirst():YTVideo | null {
        if (this.isEmpty()) return null;
        return queue[0];
    }
}