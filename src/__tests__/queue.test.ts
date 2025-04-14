import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Queue } from '../videoAPI/queue.js';
import { ChatQueue, NhanifyQueue, YTVideo } from '../videoAPI/types.js';

describe('Queue Class', () => {
  let chatQueue: Queue;
  let nhanifyQueue: Queue;
  
  // Sample video data
  const sampleVideo: YTVideo = {
    title: 'Test Video',
    videoId: 'test123'
  };
  
  const sampleVideo2: YTVideo = {
    title: 'Test Video 2',
    videoId: 'test456'
  };

  beforeEach(() => {
    // Reset the static properties between tests
    vi.spyOn(Queue, 'setPlayingOn').mockImplementation((queueName) => {
      (Queue as any).playingOn = queueName;
    });
    
    vi.spyOn(Queue, 'getPlayingOn').mockImplementation(() => {
      return (Queue as any).playingOn;
    });

    Queue.setPlayingOn(null);
    
    // Initialize fresh queues for each test
    chatQueue = new Queue({
      type: 'chat',
      videos: []
    } as ChatQueue);
    
    nhanifyQueue = new Queue({
      type: 'nhanify',
      videos: []
    } as NhanifyQueue);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Queue initialization', () => {
    it('should initialize with empty videos array', () => {
      expect(chatQueue.getVideos()).toEqual([]);
      expect(chatQueue.isEmpty()).toBe(true);
    });
    
    it('should initialize with proper queue type', () => {
      expect(chatQueue.getQueue().type).toBe('chat');
      expect(nhanifyQueue.getQueue().type).toBe('nhanify');
    });
  });

  describe('Queue operations', () => {
    it('should add a video to the queue', () => {
      chatQueue.add(sampleVideo);
      
      expect(chatQueue.isEmpty()).toBe(false);
      expect(chatQueue.getVideos().length).toBe(1);
      expect(chatQueue.getVideos()[0].videoId).toBe('test123');
    });
    
    it('should remove a video from the queue', () => {
      chatQueue.add(sampleVideo);
      chatQueue.add(sampleVideo2);
      
      expect(chatQueue.getVideos().length).toBe(2);
      
      chatQueue.remove();
      
      expect(chatQueue.getVideos().length).toBe(1);
      expect(chatQueue.getFirst()?.videoId).toBe('test456');
    });
    
    it('should get the first video without removing it', () => {
      chatQueue.add(sampleVideo);
      chatQueue.add(sampleVideo2);
      
      const firstVideo = chatQueue.getFirst();
      
      expect(firstVideo?.videoId).toBe('test123');
      expect(chatQueue.getVideos().length).toBe(2);
    });
    
    it('should get the last video in the queue', () => {
      chatQueue.add(sampleVideo);
      chatQueue.add(sampleVideo2);
      
      const lastVideo = chatQueue.getLast();
      
      expect(lastVideo?.videoId).toBe('test456');
    });
    
    it('should clear all videos from the queue', () => {
      chatQueue.add(sampleVideo);
      chatQueue.add(sampleVideo2);
      
      chatQueue.clear();
      
      expect(chatQueue.isEmpty()).toBe(true);
      expect(chatQueue.getVideos().length).toBe(0);
    });
    
    it('should replace the queue with a new one', () => {
      chatQueue.add(sampleVideo);
      
      const newQueue: NhanifyQueue = {
        type: 'nhanify',
        title: 'New Queue',
        creator: 'Test Creator',
        videos: [sampleVideo2]
      };
      
      nhanifyQueue.nextQueue(newQueue);
      
      expect(nhanifyQueue.getQueue().title).toBe('New Queue');
      expect(nhanifyQueue.getVideos().length).toBe(1);
      expect(nhanifyQueue.getFirst()?.videoId).toBe('test456');
    });
  });

  describe('Static queue methods', () => {
    it('should track which queue is playing', () => {
      expect(Queue.getPlayingOn()).toBe(null);
      
      Queue.setPlayingOn('chat');
      expect(Queue.getPlayingOn()).toBe('chat');
      
      Queue.setPlayingOn('nhanify');
      expect(Queue.getPlayingOn()).toBe('nhanify');
      
      Queue.setPlayingOn(null);
      expect(Queue.getPlayingOn()).toBe(null);
    });
    
    it('should toggle play state', () => {
      expect(Queue.getIsPlaying()).toBe(true); // Default state
      
      Queue.toggleIsPlaying();
      expect(Queue.getIsPlaying()).toBe(false);
      
      Queue.toggleIsPlaying();
      expect(Queue.getIsPlaying()).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle operations on empty queue', () => {
      expect(chatQueue.isEmpty()).toBe(true);
      expect(chatQueue.getFirst()).toBe(null);
      expect(chatQueue.getLast()).toBe(null);
      
      // These operations should not throw errors on empty queues
      chatQueue.remove();
      chatQueue.clear();
    });
    
    it('should handle invalid videos', () => {
      // @ts-ignore - Testing invalid input
      chatQueue.add(null);
      // @ts-ignore - Testing invalid input
      chatQueue.add({});
      // @ts-ignore - Testing invalid input
      chatQueue.add({ title: 'No ID Video' });
      
      expect(chatQueue.isEmpty()).toBe(true);
    });
    
    it('should handle invalid queue replacement', () => {
      // @ts-ignore - Testing invalid input
      nhanifyQueue.nextQueue(null);
      expect(nhanifyQueue.isEmpty()).toBe(true);
      
      // @ts-ignore - Testing invalid input
      nhanifyQueue.nextQueue({});
      expect(nhanifyQueue.isEmpty()).toBe(true);
      
      // @ts-ignore - Testing invalid input
      nhanifyQueue.nextQueue({ type: 'nhanify' });
      expect(nhanifyQueue.isEmpty()).toBe(true);
    });
  });
});