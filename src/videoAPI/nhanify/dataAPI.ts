import auth from '../../auth.json' with {type: 'json'};
import { Nhanify, NhanifyPlaylist, NhanifyQueue, PlaylistAPI, YTVideo } from '../types.js';
import { config } from '../../config.js';
export const nhanify: Nhanify = {
    playlistIndex: 0,
    playlists: [],
    async setPublicPlaylists() {
        this.playlists = await getPublicPlaylists();
        if (this.playlists.length === 0) console.log("Public playlists were not found on Nhanify.");
        this.playlists.forEach(playlist => console.log(JSON.stringify(playlist)));
    },
    async setPlaylistsById(playlistIds: number[]) {
        this.playlists = await getPlaylistsById(playlistIds);
        if (this.playlists.length === 0) console.log("None of the specified playlists were not found on Nhanify.");
        this.playlists.forEach(playlist => console.log(JSON.stringify(playlist)));
    },
    async nextPlaylist(): Promise<NhanifyQueue> {
        let playlistLength: number = 0;
        let creator: string = "";
        let title: string = "";
        let videos: YTVideo[] = [];
        let count = 1;
        let id = 0;
        while (playlistLength === 0 && count <= this.playlists.length) {
            const playlist = this.getPlaylist();
            creator = playlist.creator;
            title = playlist.title;
            id = playlist.id;
            videos = await this.getSongs(playlist.id);
            playlistLength = videos.length;
            this.playlistIndex += 1;
            count += 1;
        }
        return { type: "nhanify", id, videos, creator, title }
    },

    getPlaylist(): NhanifyPlaylist {
        return this.playlists[this.playlistIndex % this.playlists.length]; //0 % 4 4 % 4
    },
    async getSongs(playlistId: number): Promise<YTVideo[]> {
        //console.log("ID____", playlistId);
        const response = await fetch(`${auth.NHANIFY_URL}/api/playlists/${playlistId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${auth.NHANIFY_API_KEY}`,
                'User-Id': auth.NHANIFY_ID,
            },
        });

        const playlist: { songs: { durationSec: number }[] } = await response.json();
        const filterPlaylists = playlist.songs.filter(song => song.durationSec <= config.VIDEO_MAX_DURATION);
        if (filterPlaylists.length > 0) return shuffleItems(filterPlaylists as YTVideo[]);
        return [];
    },
}

async function getPlaylistsById(playlistsId: number[]): Promise<NhanifyPlaylist[]> {
    const queryParams = playlistsId.map(idValue => `id=${idValue}`).join('&');
    const response = await fetch(`${auth.NHANIFY_URL}/api/playlists?${queryParams}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${auth.NHANIFY_API_KEY}`,
            'User-Id': auth.NHANIFY_ID,
        },
    });
    const result = await response.json();
    if (!response.ok) {
        console.log(`Unable to fetch playlists from Nhanify: ${result.error}`);
        return [];
    }
    const playlists: PlaylistAPI[] = result.playlists;
    const filterPlaylists = playlists.filter(playlist => playlist.songCount > 0);
    const playlistsTrans = filterPlaylists.map((playlist) => {
        return {
            id: playlist.id,
            title: playlist.title,
            creator: playlist.creator.username
        };

    });
    return playlistsTrans;
}

async function getPublicPlaylists() {
    const response = await fetch(`${auth.NHANIFY_URL}/api/playlists/public`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${auth.NHANIFY_API_KEY}`,
            'User-Id': auth.NHANIFY_ID,
        },
    });
    const result = await response.json();
    const filteredPlaylists = result.playlists.filter((playlist: { songCount: number; }) => playlist.songCount > 0);
    const playlists = filteredPlaylists.map((playlist: { id: number; title: string; creator: { username: string; }; }) => {
        return {
            id: playlist.id,
            title: playlist.title,
            creator: playlist.creator.username
        }
    });
    return shuffleItems(playlists) as NhanifyPlaylist[];
}

function shuffleItems(items: NhanifyPlaylist[] | YTVideo[]): YTVideo[] {
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1)); // Random index from 0 to i
        [items[i], items[j]] = [items[j], items[i]]; // Swap elements
    }
    return items;
}