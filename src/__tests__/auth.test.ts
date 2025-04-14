import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authenticateTwitchToken, updateAuth } from '../twitch/auth.js';

// Mock fetch
vi.mock('node:fs', () => ({
  writeFileSync: vi.fn()
}));

// Mock dependencies
vi.mock('../server/webServer.js', () => ({
  tokenPromiseBot: Promise.resolve({ type: 'data', body: { access_token: 'new-token', refresh_token: 'new-refresh' } }),
  tokenPromiseBroadcaster: Promise.resolve({ type: 'data', body: { access_token: 'new-broadcaster-token', refresh_token: 'new-broadcaster-refresh' } })
}));

// Mock the open module
vi.mock('open', () => ({
  default: vi.fn()
}));

// Auth module uses import with assertions so we need to mock that
vi.mock('../auth.json', () => ({
  default: {
    BOT_TWITCH_TOKEN: 'old-bot-token',
    BOT_REFRESH_TWITCH_TOKEN: 'old-bot-refresh',
    BROADCASTER_TWITCH_TOKEN: 'old-broadcaster-token',
    BROADCASTER_REFRESH_TWITCH_TOKEN: 'old-broadcaster-refresh',
    CLIENT_ID: 'test-client-id',
    CLIENT_SECRET: 'test-client-secret',
    BOT_ID: '123',
    BROADCASTER_ID: '456',
    WEB_SERVER_PORT: '3000'
  }
}), { virtual: true });

describe('Twitch Authentication', () => {
  // Mock global fetch
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('authenticateTwitchToken', () => {
    it('should validate a valid token', async () => {
      // Mock successful validation
      (global.fetch as any).mockResolvedValueOnce({
        status: 200,
        json: async () => ({ client_id: 'test-client-id', user_id: '123' })
      });
      
      await authenticateTwitchToken('bot', 'valid-token', 'refresh-token');
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://id.twitch.tv/oauth2/validate',
        expect.objectContaining({
          headers: { 'Authorization': 'OAuth valid-token' }
        })
      );
    });
    
    it('should refresh an invalid token', async () => {
      // Mock failed validation
      (global.fetch as any).mockResolvedValueOnce({
        status: 401,
        json: async () => ({ message: 'invalid access token' })
      });
      
      // Mock successful token refresh
      (global.fetch as any).mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          access_token: 'new-token',
          refresh_token: 'new-refresh',
          scope: ['chat:read', 'chat:edit']
        })
      });
      
      const updateAuthSpy = vi.spyOn({ updateAuth }, 'updateAuth');
      
      await authenticateTwitchToken('bot', 'invalid-token', 'refresh-token');
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://id.twitch.tv/oauth2/validate',
        expect.any(Object)
      );
    });
  });
  
  describe('updateAuth', () => {
    it('should update bot credentials on successful refresh', async () => {
      // Mock successful token refresh
      (global.fetch as any).mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          access_token: 'new-bot-token',
          refresh_token: 'new-bot-refresh',
          scope: ['chat:read', 'chat:edit']
        })
      });
      
      const result = await updateAuth('bot', 'old-refresh-token');
      
      expect(result.type).toBe('data');
      expect(result.body.access_token).toBe('new-bot-token');
      expect(result.body.refresh_token).toBe('new-bot-refresh');
    });
    
    it('should handle refresh failures', async () => {
      // Mock failed token refresh
      (global.fetch as any).mockResolvedValueOnce({
        status: 400,
        json: async () => ({
          error: 'invalid_grant',
          message: 'Invalid refresh token'
        })
      });
      
      // This requires browser authentication which we can't fully test here
      const result = await updateAuth('bot', 'invalid-refresh-token');
      
      // We expect it to try browser auth, but we can't fully test that flow
      expect(global.fetch).toHaveBeenCalledWith(
        'https://id.twitch.tv/oauth2/token',
        expect.any(Object)
      );
    });
  });
});