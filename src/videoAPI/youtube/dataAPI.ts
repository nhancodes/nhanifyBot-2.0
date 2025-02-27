import { YTVideo } from '../types.js';

//https://www.youtube.com/watch?v=_QkGAaYtXA0
//https://youtu.be/_QkGAaYtXA0?si=swsvRGOx6nBab1Qh
//https://m.youtube.com/watch?v=_QkGAaYtXA0
export function isValidURL(URLInput: string): boolean {
  try {
    const { protocol, hostname, pathname, searchParams } = new URL(URLInput);
    const videoId = searchParams.get("v");
    if (protocol === "https:" || protocol === "http:") {
      if (
        (hostname === "www.youtube.com" && pathname === "/watch" && videoId) ||
        (hostname === "youtu.be" && pathname) ||
        (hostname === "m.youtube.com" && pathname === "/watch" && videoId)
      )
        return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

export function parseURL(URLInput: string): string {
  const url = new URL(URLInput);
  if (url.hostname === "youtu.be") return url.pathname.substring(1);
  return url.searchParams.get('v')!;
}

export async function getVideoById(videoId: string, YT_API_KEY: string): Promise<YTVideo> {
  try {
    const headers = { headers: { Accept: "application/json" } };
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.search = new URLSearchParams({
      key: YT_API_KEY,
      id: videoId,
      part: ["liveStreamingDetails", "snippet", "contentDetails", "status"].join(','),
    }).toString();
    const response = await fetch(url, headers);
    const result = await response.json();
    const item = result.items[0];
    // console.log("THE ITEM", item);
    if (!item) return {};
    const { status: { embeddable }, liveStreamingDetails, contentDetails } = item;
    const { regionRestriction, duration, contentRating: { ytRating: ageRestriction } } = contentDetails;

    if ((liveStreamingDetails && !liveStreamingDetails.actualEndTime) || (liveStreamingDetails && liveStreamingDetails.actualEndTime && liveStreamingDetails.actualEndTime > new Date())) return { restriction: "liveStream" };

    if (ageRestriction && ageRestriction === "ytAgeRestricted") return { restriction: "age" };

    if (regionRestriction) {
      if (regionRestriction.allowed && !regionRestriction.allowed.includes('US') || (regionRestriction.blocked && regionRestriction.blocked.includes('US'))) return { restriction: "region" };
    }

    if (embeddable === false) return { restriction: "notEmbeddable" };

    if (convertSeconds(duration) > 600) return { restriction: "duration" };

    return {
      title: result.items[0].snippet.title,
      id: result.items[0].id,
    };
  } catch (error) {
    console.error(error);
    return {};
  }
}

function convertSeconds(duration: string): number {
  const durationStr = duration.split("T")[1];
  let seconds = 0;
  let numStr = "";

  durationStr.split("").forEach((char) => {
    if (!Number.isNaN(Number(char))) {
      numStr += char;
    } else {
      if (char === "H") seconds += +numStr * 3600;
      if (char === "M") seconds += +numStr * 60;
      if (char === "S") seconds += +numStr;
      numStr = "";
    }
  });
  return seconds;
}