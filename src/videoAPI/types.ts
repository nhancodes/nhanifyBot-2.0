
export type PlaylistAPI = { id: number; title: string; songCount: number; creator: { username: string; } };
export type YTVideo = {
    title?: string;
    videoId?: string;
    restriction?: string;
};

export type NhanifyPlaylist = { id: number; title: string, creator: string };
type QueueType<Type extends string> = {
    type: Type;
    title?: string;
    creator?: string;
    length?: number;
    videos: YTVideo[]
}

export type Nhanify = {
    playlistIndex: number;
    playlists: NhanifyPlaylist[]; // Assume `getPublicPlaylists()` resolves to this
    setPublicPlaylists(): Promise<void>;
    setPlaylistsById(playlistIds: number[]): Promise<void>;
    nextPlaylist(): void;
    isLastPlaylist(): boolean;
    getPlaylist(): NhanifyPlaylist;
    getSongs(): Promise<YTVideo[]>; // Assuming `songs` is an array of any type
} | null;
export type ChatQueue = QueueType<'chat'>;
export type NhanifyQueue = QueueType<'nhanify'>;

export class VideoError extends Error { };
