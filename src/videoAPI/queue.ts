import type { YTVideo, ChatQueue, NhanifyQueue } from './types.js';

// Type for queue identifier
type QueueType = "nhanify" | "chat" | null;

/**
 * Queue class for managing video queues
 * Handles both chat and nhanify queues with proper state management
 */
export class Queue {
    private queue: ChatQueue | NhanifyQueue;
    private static playingOn: QueueType = null;
    private static isPlaying: boolean = true;
    private static queueOperationLock: boolean = false; // Simple lock for queue operations
    
    constructor(queue: ChatQueue | NhanifyQueue) {
        this.queue = queue;
        this.queue.length = this.queue.videos.length;
    }
    
    /**
     * Get playing state
     */
    static getIsPlaying(): boolean {
        return Queue.isPlaying;
    }
    
    /**
     * Toggle playing state
     */
    static toggleIsPlaying(): void {
        Queue.isPlaying = !Queue.isPlaying;
    }
    
    /**
     * Set which queue is currently playing
     */
    static setPlayingOn(queueName: QueueType): void {
        Queue.playingOn = queueName;
        console.log(`Now playing from ${queueName || 'no'} queue`);
    }
    
    /**
     * Get which queue is currently playing
     */
    static getPlayingOn(): QueueType {
        return Queue.playingOn;
    }
    
    /**
     * Update the queue with a new one
     */
    nextQueue(queue: NhanifyQueue): void {
        // Wait for lock to be available
        while (Queue.queueOperationLock) {
            // Simple spinlock - in production would use proper async locking
            console.log('Waiting for queue operation lock...');
        }
        
        try {
            Queue.queueOperationLock = true;
            
            // Validate the queue before assigning
            if (!queue || !queue.videos) {
                console.error('Invalid queue provided to nextQueue:', queue);
                queue = { type: "nhanify", videos: [] } as NhanifyQueue;
            }
            
            this.queue = queue;
            this.queue.length = Array.isArray(queue.videos) ? queue.videos.length : 0;
            
            console.log(`Queue updated with ${this.queue.length} videos`);
        } finally {
            Queue.queueOperationLock = false;
        }
    }
    
    /**
     * Get the current queue
     */
    getQueue(): NhanifyQueue | ChatQueue {
        return this.queue;
    }
    
    /**
     * Get all videos in the queue
     */
    getVideos(): YTVideo[] {
        return Array.isArray(this.queue.videos) ? this.queue.videos : [];
    }
    
    /**
     * Add a video to the queue
     */
    add(video: YTVideo): void {
        // Wait for lock to be available
        while (Queue.queueOperationLock) {
            console.log('Waiting for queue operation lock...');
        }
        
        try {
            Queue.queueOperationLock = true;
            
            // Validate video before adding
            if (!video || !video.videoId) {
                console.warn('Attempted to add invalid video to queue:', video);
                return;
            }
            
            // Initialize videos array if it doesn't exist
            if (!Array.isArray(this.queue.videos)) {
                this.queue.videos = [];
            }
            
            this.queue.videos.push(video);
            this.queue.length = this.queue.videos.length;
            
            console.log(`Added video to queue: ${video.title || video.videoId}`);
        } finally {
            Queue.queueOperationLock = false;
        }
    }
    
    /**
     * Remove the first video from the queue
     */
    remove(): void {
        // Wait for lock to be available
        while (Queue.queueOperationLock) {
            console.log('Waiting for queue operation lock...');
        }
        
        try {
            Queue.queueOperationLock = true;
            
            // Check if videos array exists and has items
            if (!Array.isArray(this.queue.videos) || this.queue.videos.length === 0) {
                console.warn('Attempted to remove from empty queue');
                return;
            }
            
            const removed = this.queue.videos.shift();
            this.queue.length = this.queue.videos.length;
            
            console.log(`Removed video from queue: ${removed?.title || removed?.videoId || 'unknown'}`);
        } finally {
            Queue.queueOperationLock = false;
        }
    }
    
    /**
     * Check if the queue is empty
     */
    isEmpty(): boolean {
        return !Array.isArray(this.queue.videos) || this.queue.videos.length === 0;
    }
    
    /**
     * Get the first video in the queue without removing it
     */
    getFirst(): YTVideo | null {
        if (this.isEmpty()) return null;
        return this.queue.videos[0];
    }
    
    /**
     * Get the last video in the queue
     */
    getLast(): YTVideo | null {
        if (this.isEmpty()) return null;
        return this.queue.videos[this.queue.videos.length - 1];
    }
    
    /**
     * Clear all videos from the queue
     */
    clear(): void {
        // Wait for lock to be available
        while (Queue.queueOperationLock) {
            console.log('Waiting for queue operation lock...');
        }
        
        try {
            Queue.queueOperationLock = true;
            
            this.queue.videos = [];
            this.queue.length = 0;
            
            console.log(`Cleared all videos from ${this.queue.type} queue`);
        } finally {
            Queue.queueOperationLock = false;
        }
    }
}

// Track saved videos by user
export const savedVideos: { [key: string]: string[] } = {};

export { ChatQueue };