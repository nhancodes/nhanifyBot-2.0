import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	isValidURL,
	parseURL,
	getVideoById,
} from "../videoAPI/youtube/dataAPI.js";

describe("YouTube API Functions", () => {
	// Set up global mock for fetch
	beforeEach(() => {
		global.fetch = vi.fn();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("isValidURL", () => {
		it("should validate standard YouTube URLs", () => {
			expect(isValidURL("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
				true,
			);
			expect(isValidURL("https://youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
			expect(isValidURL("https://m.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
				true,
			);
			expect(isValidURL("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
			expect(isValidURL("https://music.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
				true,
			);
		});

		it("should reject invalid YouTube URLs", () => {
			expect(isValidURL("https://www.youtube.com")).toBe(false);
			expect(isValidURL("https://www.youtube.com/playlist?list=123")).toBe(
				false,
			);
			expect(isValidURL("https://www.youtube.com/channel/123")).toBe(false);
			expect(isValidURL("https://www.youtube.com/watch")).toBe(false);
			expect(isValidURL("https://www.youtube.com/watch?list=123")).toBe(false);
			expect(isValidURL("https://www.notyoutube.com/watch?v=123")).toBe(false);
		});

		it("should handle URLs with extra parameters", () => {
			expect(
				isValidURL(
					"https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=123&index=5",
				),
			).toBe(true);
			expect(isValidURL("https://youtu.be/dQw4w9WgXcQ?si=abc123")).toBe(true);
		});

		it("should handle invalid inputs", () => {
			expect(isValidURL("")).toBe(false);
			expect(isValidURL("not a url")).toBe(false);
			expect(isValidURL("http://")).toBe(false);
		});
	});

	describe("parseURL", () => {
		it("should extract video ID from standard YouTube URLs", () => {
			expect(parseURL("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
				"dQw4w9WgXcQ",
			);
			expect(parseURL("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
			expect(parseURL("https://m.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
				"dQw4w9WgXcQ",
			);
		});

		it("should handle URLs with extra parameters", () => {
			expect(
				parseURL(
					"https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=123&index=5",
				),
			).toBe("dQw4w9WgXcQ");
			expect(parseURL("https://youtu.be/dQw4w9WgXcQ?si=abc123")).toBe(
				"dQw4w9WgXcQ",
			);
		});
	});

	describe("getVideoById", () => {
		it("should return video information for valid videos", async () => {
			// Mock successful API response
			(global.fetch as any).mockResolvedValue({
				json: async () => ({
					items: [
						{
							id: "test123",
							snippet: {
								title: "Test Video",
							},
							status: {
								embeddable: true,
							},
							contentDetails: {
								duration: "PT3M30S",
								contentRating: {},
							},
						},
					],
				}),
			});

			const result = await getVideoById("test123", "fake-api-key");

			expect(result).toEqual({
				title: "Test Video",
				videoId: "test123",
			});

			expect(global.fetch).toHaveBeenCalledWith(expect.any(URL), {
				headers: {
					Accept: "application/json",
				},
			});
		});

		it("should handle videos with restrictions", async () => {
			// Test age-restricted video
			(global.fetch as any).mockResolvedValue({
				json: async () => ({
					items: [
						{
							status: { embeddable: true },
							contentDetails: {
								duration: "PT3M30S",
								contentRating: { ytRating: "ytAgeRestricted" },
							},
						},
					],
				}),
			});

			const ageRestrictedResult = await getVideoById("age123", "fake-api-key");
			expect(ageRestrictedResult).toEqual({ restriction: "age" });

			// Test non-embeddable video
			(global.fetch as any).mockResolvedValue({
				json: async () => ({
					items: [
						{
							status: { embeddable: false },
							contentDetails: {
								duration: "PT3M30S",
								contentRating: {},
							},
						},
					],
				}),
			});

			const nonEmbeddableResult = await getVideoById(
				"embed123",
				"fake-api-key",
			);
			expect(nonEmbeddableResult).toEqual({ restriction: "notEmbeddable" });

			// Test region-restricted video
			(global.fetch as any).mockResolvedValue({
				json: async () => ({
					items: [
						{
							status: { embeddable: true },
							contentDetails: {
								duration: "PT3M30S",
								regionRestriction: { blocked: ["US"] },
								contentRating: {},
							},
						},
					],
				}),
			});

			const regionRestrictedResult = await getVideoById(
				"region123",
				"fake-api-key",
			);
			expect(regionRestrictedResult).toEqual({ restriction: "region" });

			// Test long duration video
			(global.fetch as any).mockResolvedValue({
				json: async () => ({
					items: [
						{
							status: { embeddable: true },
							contentDetails: {
								duration: "PT20M30S", // 20 minutes
								contentRating: {},
							},
						},
					],
				}),
			});

			const longDurationResult = await getVideoById("long123", "fake-api-key");
			expect(longDurationResult).toEqual({ restriction: "duration" });
		});

		it("should handle API errors and non-existent videos", async () => {
			// Mock API error
			(global.fetch as any).mockRejectedValue(new Error("API Error"));

			const errorResult = await getVideoById("error123", "fake-api-key");
			expect(errorResult).toEqual({});

			// Mock empty response (no video found)
			(global.fetch as any).mockResolvedValue({
				json: async () => ({ items: [] }),
			});

			const emptyResult = await getVideoById("nonexistent123", "fake-api-key");
			expect(emptyResult).toEqual({});
		});
	});
});
