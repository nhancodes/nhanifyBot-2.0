import { YTVideo, VideoError } from '../types.js';

export function isValidURL(URLInput: string): boolean {
  const url = new URL(URLInput);
  const protocol = url.protocol;
  const hostname = url.hostname;
  const pathname = url.pathname;
  const videoId = url.searchParams.get("v");
  if (protocol === "https:" || protocol === "http:") {
    if (
      (hostname === "www.youtube.com" && pathname === "/watch" && videoId) ||
      (hostname === "youtu.be" && pathname) ||
      (hostname === "m.youtube.com" && pathname === "/watch" && videoId)
    )
      return true;
  }
  return false;
}

function parseURL(URLInput: string): string | null {
  if (URLInput.includes("youtu.be")) {
    let hostPath = URLInput.split("?")[0];
    let path = hostPath.split("/");
    return path[path.length - 1];
  }
  let queryStr = URLInput.split("?")[1];
  let params = queryStr.split("&");
  let videoIdParam = getVideoIdParams(params);
  if (videoIdParam) return videoIdParam.substring(2);
  return null;
}
function getVideoIdParams(params: string[]): string | null {
  for (let i = 0; i < params.length; i += 1) {
    let param = params[i];
    if (param.includes("v=")) return params[i];
  }
  return null;
}

async function getVidInfoByVidId(videoId: string, YT_API_KEY: string): Promise<YTVideo> {
  const headers = { headers: { Accept: "application/json" } };
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.search = new URLSearchParams({
    key: YT_API_KEY,
    id: videoId,
    part: ["liveStreamingDetails", "snippet", "contentDetails", "status"].join(','),
  }).toString();
  const response = await fetch(url, headers);
  const result = await response.json();
  if (!result.items[0]) return null;
  console.log("RESULT ITEM", result.items[0]);
  const regionRestriction = result.items[0].contentDetails.regionRestriction;
  const ageRestriction = result.items[0].contentDetails.contentRating.ytRating;
  const liveStream = result.items[0].liveStreamingDetails;
  const duration = result.items[0].contentDetails.duration;
  const embeddable = result.items[0].status.embeddable;
  //console.log({liveStream});
  if ((liveStream && !liveStream.actualEndTime) || (liveStream && liveStream.actualEndTime && liveStream.actualEndTime > new Date())) {
    throw new VideoError("liveStreamRestriction");
  }
  if (ageRestriction && ageRestriction === "ytAgeRestricted") throw new VideoError("ageRestriction");

  if (regionRestriction) {
    if ((regionRestriction.allowed && !regionRestriction.allowed.includes('US')) || (regionRestriction.blocked && regionRestriction.blocked.includes('US'))) {
      throw new VideoError("regionRestriction");
    }
  }
  if (embeddable === false) throw new VideoError("notEmbeddable");
  console.log(convertSeconds(duration));
  if (convertSeconds(duration) > 600) throw new VideoError("durationRestriction");

  /*const duration = convertDuration(result.items[0].contentDetails.duration);
  console.log("CONTENTDETAILS", result.items[0].contentDetails);
  const durationSecs = convertToSec(duration);
  */
  return {
    title: result.items[0].snippet.title,
    id: result.items[0].id,
  } as YTVideo;
}

export async function getVideo(vidUrl: string, YT_API_KEY: string): Promise<YTVideo> {
  const videoId = parseURL(vidUrl);
  if (videoId) return await getVidInfoByVidId(videoId, YT_API_KEY);
  return null;
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