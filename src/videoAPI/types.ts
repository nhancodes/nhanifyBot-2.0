export type YTVideo = {
    title?: string;
    videoId?: string;
    restriction?: string;
};

export type NhanifyPlaylist = {id: number; title: string, creator: string};
type QueueType<Type extends string> = {
    type: Type;
    title?: string;
    creator?: string;
    length?: number;
    videos: YTVideo[]
}

export type Nhanify  = {
    playlistIndex: number;
    playlists: NhanifyPlaylist []; // Assume `getPublicPlaylists()` resolves to this
    nextPlaylist(): void;
    getPlaylist(): NhanifyPlaylist ;
    getSongs(): Promise<YTVideo[]>; // Assuming `songs` is an array of any type
}
export type ChatQueue = QueueType<'chat'>;
export type NhanifyQueue = QueueType<'nhanify'>;

export class VideoError extends Error { };
