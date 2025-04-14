import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WebSocket } from "ws";
import { Queue } from "../videoAPI/queue.js";
import { playerReady } from "../commands.js";
import { ChatQueue, NhanifyQueue } from "../videoAPI/types.js";

// Mock dependencies
vi.mock("../commands.js", () => ({
	playerReady: vi.fn(),
}));

vi.mock("ws", () => {
	const MockWebSocket = vi.fn().mockImplementation(() => ({
		send: vi.fn(),
		on: vi.fn(),
		ping: vi.fn(),
		terminate: vi.fn(),
		close: vi.fn(),
		readyState: 1, // WebSocket.OPEN
	}));

	MockWebSocket.OPEN = 1;

	return {
		WebSocket: MockWebSocket,
		WebSocketServer: vi.fn().mockImplementation(() => ({
			on: vi.fn(),
			clients: new Set([new MockWebSocket()]),
			close: vi.fn(),
		})),
	};
});

describe("WebSocket Server Message Handling", () => {
	let mockWebSocket: WebSocket;
	let mockIrcClient: WebSocket;
	let chatQueue: Queue;
	let nhanifyQueue: Queue;

	beforeEach(() => {
		// Create mock WebSocket
		mockWebSocket = new WebSocket("ws://localhost:3000");
		mockIrcClient = new WebSocket("ws://localhost:3000");

		// Mock the send method
		mockIrcClient.send = vi.fn();

		// Setup queues
		chatQueue = new Queue({
			type: "chat",
			videos: [{ title: "Test Video", videoId: "test123" }],
		} as ChatQueue);

		nhanifyQueue = new Queue({
			type: "nhanify",
			videos: [{ title: "Nhanify Video", videoId: "nhanify123" }],
		} as NhanifyQueue);

		// Reset playerReady mock
		vi.mocked(playerReady).mockClear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	// Simulating WebSocket message handling function
	async function handleMessage(messageData: any) {
		const message = JSON.stringify(messageData);

		try {
			const data = JSON.parse(message);

			if (data.action === "finished") {
				if (Queue.getPlayingOn() === "nhanify") nhanifyQueue.remove();
				if (Queue.getPlayingOn() === "chat") chatQueue.remove();
				await playerReady(
					mockWebSocket,
					chatQueue,
					nhanifyQueue,
					mockIrcClient,
				);
			} else if (data.action === "ready") {
				await playerReady(
					mockWebSocket,
					chatQueue,
					nhanifyQueue,
					mockIrcClient,
				);
			} else if (data.action === "pause" || data.action === "resume") {
				mockIrcClient.send(`PRIVMSG #test : Player ${data.action}d.`);
			} else if (data.action === "skipSong") {
				mockIrcClient.send(`PRIVMSG #test : Skipped song.`);
			} else if (data.action === "skipPlaylist") {
				mockIrcClient.send(`PRIVMSG #test : Skipped playlist.`);
			}
		} catch (error) {
			console.error("Error in test message handler:", error);
		}
	}

	it("should call playerReady when receiving ready message", async () => {
		await handleMessage({ action: "ready" });

		expect(playerReady).toHaveBeenCalledWith(
			mockWebSocket,
			chatQueue,
			nhanifyQueue,
			mockIrcClient,
		);
	});

	it("should handle finished message by removing from active queue", async () => {
		// Set initial state
		Queue.getPlayingOn = vi.fn().mockReturnValue("chat");

		const removeSpy = vi.spyOn(chatQueue, "remove");

		await handleMessage({ action: "finished" });

		expect(removeSpy).toHaveBeenCalled();
		expect(playerReady).toHaveBeenCalled();
	});

	it("should send appropriate messages for pause/resume actions", async () => {
		await handleMessage({ action: "pause" });

		expect(mockIrcClient.send).toHaveBeenCalledWith(
			expect.stringContaining("Player paused"),
		);

		await handleMessage({ action: "resume" });

		expect(mockIrcClient.send).toHaveBeenCalledWith(
			expect.stringContaining("Player resumed"),
		);
	});

	it("should handle skipSong and skipPlaylist actions", async () => {
		await handleMessage({ action: "skipSong" });

		expect(mockIrcClient.send).toHaveBeenCalledWith(
			expect.stringContaining("Skipped song"),
		);

		await handleMessage({ action: "skipPlaylist" });

		expect(mockIrcClient.send).toHaveBeenCalledWith(
			expect.stringContaining("Skipped playlist"),
		);
	});

	it("should still handle ready even when IRC client is not available", async () => {
		// Set IRC client to unavailable
		mockIrcClient.readyState = 0; // Not OPEN

		await handleMessage({ action: "ready" });

		expect(playerReady).toHaveBeenCalled();
	});
});
