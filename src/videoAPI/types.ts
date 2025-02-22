export type YTVideo = { title: string; id: string } | null;
type QueueType<Type extends string> = {
    type: Type;
    title?: string;
    creator?: string;

    length?: number;
    videos: YTVideo[]
}

export type ChatQueue = QueueType<'chat'>;
export type NhanifyQueue = QueueType<'nhanify'>;

export class VideoError extends Error { };
