import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	playerSkipSong,
	playerSkipPlaylist,
	playerReady,
} from "../commands.js";
import { Queue } from "../videoAPI/queue.js";
import { WebSocket } from "ws";
import type { Nhanify, YTVideo } from "../videoAPI/types.js";
import type { ChatQueue } from "../videoAPI/queue.js";

// Mock rewards module
vi.mock("../twitch/api/reward.js", () => ({
	rewards: {
		setRewardsIsPause: vi.fn().mockResolvedValue(undefined),
	},
}));

// Define interface for Queue static properties
type QueueStatic = {
	playingOn: string | null;
	isPlaying: boolean;
} & typeof Queue;

// Mock WebSocket class
const mockSend = vi.fn();
const mockWebSocketInstance = {
	send: mockSend,
	on: vi.fn(),
	close: vi.fn(),
	terminate: vi.fn(),
	readyState: 1, // OPEN
};

vi.mock("ws", () => ({
	WebSocket: vi.fn().mockImplementation(() => mockWebSocketInstance),
}));

describe("Command Handling", () => {
	let chatQueue: Queue;
	let nhanifyQueue: Queue;
	let mockWebSocketClients: Set<WebSocket>;
	let mockWebSocket: WebSocket;
	let mockNhanify: Nhanify;

	// Sample videos
	const sampleVideos: YTVideo[] = [
		{ title: "Chat Video 1", videoId: "chat1" },
		{ title: "Chat Video 2", videoId: "chat2" },
		{ title: "Nhanify Video 1", videoId: "nhanify1" },
		{ title: "Nhanify Video 2", videoId: "nhanify2" },
	];

	beforeEach(() => {
		// Reset mocks
		mockSend.mockClear();

		// Reset Queue static state with proper typing
		const queueStatic = Queue as QueueStatic;

		vi.spyOn(Queue, "setPlayingOn").mockImplementation(
			(queueName: string | null) => {
				queueStatic.playingOn = queueName;
			},
		);

		vi.spyOn(Queue, "getPlayingOn").mockImplementation(() => {
			return queueStatic.playingOn;
		});

		vi.spyOn(Queue, "getIsPlaying").mockImplementation(() => {
			return queueStatic.isPlaying;
		});

		queueStatic.playingOn = null;
		queueStatic.isPlaying = true;

		// Setup mock WebSocket client
		mockWebSocket = new WebSocket("ws://localhost:3000");
		mockWebSocketClients = new Set<WebSocket>([mockWebSocket]);

		// Setup queues
		chatQueue = new Queue({
			type: "chat",
			videos: [sampleVideos[0], sampleVideos[1]],
		} as ChatQueue);

		nhanifyQueue = new Queue({
			type: "nhanify",
			videos: [sampleVideos[2], sampleVideos[3]],
		} as NhanifyQueue);

		// Setup mock Nhanify with proper playlist handling
		mockNhanify = {
			playlistIndex: 0,
			playlists: [{ id: 1, title: "Test Playlist", creator: "Test Creator" }],
			setPublicPlaylists: vi.fn(),
			setPlaylistsById: vi.fn(),
			nextPlaylist: vi.fn().mockResolvedValue({
				type: "nhanify",
				id: 1,
				title: "New Playlist",
				creator: "New Creator",
				videos: [{ title: "New Video", videoId: "new1" }],
			}),
			getPlaylist: vi.fn().mockResolvedValue({
				type: "nhanify",
				id: 1,
				title: "Current Playlist",
				creator: "Current Creator",
				videos: [{ title: "Current Video", videoId: "current1" }],
			}),
			getSongs: vi.fn().mockResolvedValue([
				{ title: "Song 1", videoId: "song1" },
				{ title: "Song 2", videoId: "song2" },
			]),
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("playerSkipSong", () => {
		it("should skip the current song and play the next from chat queue", async () => {
			// Set initial state - playing from nhanify queue
			Queue.setPlayingOn("nhanify");

			// Call playerSkipSong
			await playerSkipSong(
				mockWebSocketClients,
				mockWebSocket,
				nhanifyQueue,
				chatQueue,
				"testUser",
				mockNhanify,
			);

			// Should switch to chat queue and send play message
			expect(Queue.getPlayingOn()).toBe("chat");
			expect(mockSend).toHaveBeenCalled();

			// Verify WebSocket clients were notified
			expect(mockSend).toHaveBeenCalledWith(expect.any(String));
		});

		it("should use nhanify queue when chat queue is empty", async () => {
			// Set initial state
			Queue.setPlayingOn("chat");
			chatQueue.clear(); // Empty chat queue

			// Mock rewards
			const mockRewards = {
				setRewardsIsPause: vi.fn().mockResolvedValue(undefined),
			};

			// Call playerSkipSong
			await playerSkipSong(
				mockWebSocketClients,
				mockWebSocket,
				nhanifyQueue,
				chatQueue,
				"testUser",
				mockNhanify,
			);

			// Should switch to nhanify queue
			expect(Queue.getPlayingOn()).toBe("nhanify");

			// Verify WebSocket clients were notified
			for (const client of mockWebSocketClients) {
				expect(client.send).toHaveBeenCalledWith(
					expect.stringContaining("play"),
				);
			}
		});

		it("should handle empty queues", async () => {
			// Set initial state
			Queue.setPlayingOn(null);

			// Call playerSkipSong
			await playerSkipSong(
				mockWebSocketClients,
				mockWebSocket,
				nhanifyQueue,
				chatQueue,
				"testUser",
				mockNhanify,
			);

			// Should notify user about empty queues
			expect(mockWebSocket.send).toHaveBeenCalledWith(
				expect.stringContaining("all queues are empty"),
			);
		});
	});

	describe("playerSkipPlaylist", () => {
		it("should skip the current nhanify playlist and load a new one", async () => {
			// Set initial state
			Queue.setPlayingOn("nhanify");

			// Call playerSkipPlaylist with mockNhanify
			await playerSkipPlaylist(
				mockWebSocketClients,
				mockWebSocket,
				nhanifyQueue,
				"testUser",
				chatQueue,
				mockNhanify,
			);

			// Verify nhanify.nextPlaylist was called
			expect(mockNhanify.nextPlaylist).toHaveBeenCalled();

			// Verify WebSocket clients were notified
			expect(mockSend).toHaveBeenCalledWith(expect.any(String));
		});

		it("should handle when not playing nhanify playlist", async () => {
			// Set initial state
			Queue.setPlayingOn("chat");

			// Call playerSkipPlaylist
			await playerSkipPlaylist(
				mockWebSocketClients,
				mockWebSocket,
				nhanifyQueue,
				"testUser",
				chatQueue,
				mockNhanify,
			);

			// Should notify user that there's no playlist to skip
			expect(mockSend).toHaveBeenCalledWith(
				expect.stringContaining("No playlist to skip"),
			);
		});

		it("should skip to the next playlist when playing nhanify queue", async () => {
			// Set initial state
			Queue.setPlayingOn("nhanify");

			// Call playerSkipPlaylist
			await playerSkipPlaylist(
				mockWebSocketClients,
				mockWebSocket,
				nhanifyQueue,
				"testUser",
				chatQueue,
				mockNhanify,
			);

			// Verify nhanify.nextPlaylist was called
			expect(mockNhanify.nextPlaylist).toHaveBeenCalled();

			// Verify WebSocket clients were notified
			expect(mockSend).toHaveBeenCalledWith(expect.any(String));
		});
	});

	describe("playerReady", () => {
		it("should load chat queue when ready if not empty", async () => {
			// Set initial state
			Queue.setPlayingOn(null);

			// Mock rewards
			const mockRewards = {
				setRewardsIsPause: vi.fn().mockResolvedValue(undefined),
			};

			// Call playerReady
			await playerReady(mockWebSocket, chatQueue, nhanifyQueue, mockNhanify);

			// Should set to chat queue
			expect(Queue.getPlayingOn()).toBe("chat");

			// Verify WebSocket was sent play message
			expect(mockWebSocket.send).toHaveBeenCalledWith(
				expect.stringContaining("play"),
			);
		});

		it("should load nhanify queue when chat queue is empty", async () => {
			// Set initial state
			Queue.setPlayingOn(null);
			chatQueue.clear(); // Empty chat queue

			// Mock rewards
			const mockRewards = {
				setRewardsIsPause: vi.fn().mockResolvedValue(undefined),
			};

			// Call playerReady
			await playerReady(mockWebSocket, chatQueue, nhanifyQueue, mockNhanify);

			// Should set to nhanify queue
			expect(Queue.getPlayingOn()).toBe("nhanify");

			// Verify WebSocket was sent play message
			expect(mockWebSocket.send).toHaveBeenCalledWith(
				expect.stringContaining("play"),
			);
		});

		it("should handle when both queues are empty", async () => {
			// Set initial state
			Queue.setPlayingOn(null);
			chatQueue.clear(); // Empty chat queue
			nhanifyQueue.clear(); // Empty nhanify queue

			// Mock rewards
			const mockRewards = {
				setRewardsIsPause: vi.fn().mockResolvedValue(undefined),
			};

			// Call playerReady
			await playerReady(mockWebSocket, chatQueue, nhanifyQueue, mockNhanify);

			// Should get a new playlist from nhanify
			expect(mockNhanify.nextPlaylist).toHaveBeenCalled();
			expect(Queue.getPlayingOn()).toBe("nhanify");

			// Verify WebSocket was sent play message
			expect(mockWebSocket.send).toHaveBeenCalledWith(
				expect.stringContaining("play"),
			);
		});
	});
});
