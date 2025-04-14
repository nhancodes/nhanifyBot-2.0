import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { nhanify } from '../videoAPI/nhanify/dataAPI.js';

// Mock dependencies
vi.mock('../auth.json', () => ({
  default: {
    NHANIFY_URL: 'https://api.nhanify.com',
    NHANIFY_API_KEY: 'test-api-key',
    NHANIFY_ID: 'test-user-id'
  }
}), { virtual: true });

vi.mock('../configType.js', () => ({
  config: {
    VIDEO_MAX_DURATION: 600 // 10 minutes
  }
}));

describe('Nhanify Integration', () => {
  // Mock global fetch
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('setPublicPlaylists', () => {
    it('should fetch and set public playlists', async () => {
      const mockPlaylists = {
        playlists: [
          {
            id: 1,
            title: 'Playlist 1',
            songCount: 10,
            creator: { username: 'Creator 1' }
          },
          {
            id: 2,
            title: 'Playlist 2',
            songCount: 5,
            creator: { username: 'Creator 2' }
          }
        ]
      };
      
      // Mock successful API response
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => mockPlaylists
      });
      
      await nhanify.setPublicPlaylists();
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.nhanify.com/api/playlists/public',
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test-api-key',
            'User-Id': 'test-user-id'
          }
        })
      );
      
      // Verify playlists were set - note the properties match the transformed format
      expect(nhanify.playlists.length).toBeGreaterThan(0);
      expect(nhanify.playlists[0]).toHaveProperty('id');
      expect(nhanify.playlists[0]).toHaveProperty('title');
      expect(nhanify.playlists[0]).toHaveProperty('creator');
    });
    
    it('should handle empty playlists', async () => {
      // Mock empty playlists response
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({ playlists: [] })
      });
      
      const consoleSpy = vi.spyOn(console, 'log');
      
      await nhanify.setPublicPlaylists();
      
      expect(nhanify.playlists).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    });
  });
  
  describe('setPlaylistsById', () => {
    it('should fetch and set playlists by ID', async () => {
      const mockPlaylists = {
        playlists: [
          {
            id: 1,
            title: 'Playlist 1',
            songCount: 10,
            creator: { username: 'Creator 1' }
          }
        ]
      };
      
      // Mock successful API response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlaylists
      });
      
      await nhanify.setPlaylistsById([1]);
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.nhanify.com/api/playlists?id=1',
        expect.any(Object)
      );
      
      // Verify playlists were set
      expect(nhanify.playlists.length).toBe(1);
      expect(nhanify.playlists[0].id).toBe(1);
    });
    
    it('should handle API errors', async () => {
      // Mock API error
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Not found' })
      });
      
      const consoleSpy = vi.spyOn(console, 'log');
      
      await nhanify.setPlaylistsById([999]);
      
      expect(nhanify.playlists).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unable to fetch playlists'));
    });
  });
  
  describe('getSongs', () => {
    it('should fetch songs for a playlist and filter by duration', async () => {
      const mockPlaylist = {
        songs: [
          { durationSec: 200, title: 'Short song', videoId: 'short1' },
          { durationSec: 900, title: 'Long song', videoId: 'long1' } // Exceeds max duration (600)
        ]
      };
      
      // Mock successful API response
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => mockPlaylist
      });
      
      const songs = await nhanify.getSongs(1);
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.nhanify.com/api/playlists/1',
        expect.any(Object)
      );
      
      // Should only include songs within duration limit
      expect(songs.length).toBe(1);
      expect(songs[0].videoId).toBe('short1');
    });
    
    it('should handle empty or all-filtered playlists', async () => {
      // Mock playlist with only long songs
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          songs: [
            { durationSec: 700, title: 'Long song 1', videoId: 'long1' },
            { durationSec: 800, title: 'Long song 2', videoId: 'long2' }
          ]
        })
      });
      
      const songs = await nhanify.getSongs(1);
      
      // All songs should be filtered out
      expect(songs).toEqual([]);
    });
  });
  
  describe('nextPlaylist', () => {
    it('should get the next playlist and its songs', async () => {
      // Setup mock playlists
      nhanify.playlists = [
        { id: 1, title: 'Playlist 1', creator: 'Creator 1' },
        { id: 2, title: 'Playlist 2', creator: 'Creator 2' }
      ];
      nhanify.playlistIndex = 0;
      
      // Mock getSongs to return videos
      vi.spyOn(nhanify, 'getSongs').mockResolvedValueOnce([
        { title: 'Song 1', videoId: 'vid1' },
        { title: 'Song 2', videoId: 'vid2' }
      ]);
      
      const result = await nhanify.nextPlaylist();
      
      // Verify playlist was advanced
      expect(nhanify.playlistIndex).toBe(1);
      
      // Verify result structure
      expect(result.type).toBe('nhanify');
      expect(result.id).toBe(1);
      expect(result.title).toBe('Playlist 1');
      expect(result.creator).toBe('Creator 1');
      expect(result.videos.length).toBe(2);
    });
    
    it('should handle empty playlists', async () => {
      // Setup mock empty playlists
      nhanify.playlists = [];
      nhanify.playlistIndex = 0;
      
      const result = await nhanify.nextPlaylist();
      
      // Should return empty videos array
      expect(result.videos).toEqual([]);
    });
    
    it('should cycle through playlists to find one with songs', async () => {
      // Setup mock playlists
      nhanify.playlists = [
        { id: 1, title: 'Empty Playlist', creator: 'Creator 1' },
        { id: 2, title: 'Playlist with songs', creator: 'Creator 2' }
      ];
      nhanify.playlistIndex = 0;
      
      // First getSongs call returns empty (for first playlist)
      vi.spyOn(nhanify, 'getSongs')
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { title: 'Song 1', videoId: 'vid1' }
        ]);
      
      const result = await nhanify.nextPlaylist();
      
      // Verify it advanced to the second playlist
      expect(nhanify.playlistIndex).toBe(2); // Index advances twice
      expect(result.id).toBe(2);
      expect(result.videos.length).toBe(1);
    });
  });
});