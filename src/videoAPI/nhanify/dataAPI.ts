//for nhanify
//update add song to invalidate videos that can't be play on the player
//when loading the playlist check all songs to see if they still exist if not render the song grey and have the player skip the song

import auth from '../../auth.json' with {type: 'json'};
import { Queue } from '../queue.js';
import { Nhanify, NhanifyPlaylist, NhanifyQueue, PlaylistAPI, YTVideo } from '../types.js';
export type Config = { nhanify: Nhanify, queue: NhanifyQueue };
export const nhanify: Nhanify = {
    playlistIndex: 0,
    playlists: [],
    async setPublicPlaylists() {
        this.playlists = await getPublicPlaylists();
        this.playlists.forEach(playlist => console.log(JSON.stringify(playlist)));
    },
    async setPlaylistsById(playlistIds: number[]) {
        this.playlists = await getPlaylistsById(playlistIds);
        this.playlists.forEach(playlist => console.log(JSON.stringify(playlist)));
    },
    async nextPlaylist(): Promise<NhanifyQueue> {
        let playlistLength : number = 0;
        let creator : string = "";
        let title : string = "";
        let videos: YTVideo []  = [];
        let count = 1;
        //console.log("IN NEXTPlAYLIST", count);
        while (playlistLength === 0 && count <= this.playlists.length) { 
            const playlist = this.getPlaylist();
            //console.log({playlist});
            creator = playlist.creator;
            title = playlist.title;
            videos = await this.getSongs(playlist.id);
            playlistLength = videos.length;
            this.playlistIndex += 1;
            count += 1;
        }
        return { type: "nhanify", videos, creator, title }
    },
    getPlaylist(): NhanifyPlaylist {
        return this.playlists[this.playlistIndex % this.playlists.length]; //0 % 4 4 % 4
    },
    async getSongs(playlistId: number): Promise<YTVideo[]> {
        //console.log("ID____", playlistId);
        const response = await fetch(`${auth.HOST}/api/playlists/${playlistId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${auth.NHANIFY_API_KEY}`,
                'User-Id': auth.NHANCODES_ID,
            },
        });

        const playlist: { songs: { durationSec: number }[] } = await response.json();
        //console.log("SONGS IN PLAYLIST____", playlist);
        //console.log("SONGS IN PLAYLIST____", playlist.songs);
        const filterPlaylists = playlist.songs.filter(song => song.durationSec <= 600);
        if (filterPlaylists.length > 0) return shuffleItems(filterPlaylists as YTVideo[]);
        return [];
    },
}

async function getPlaylistsById(playlistsId: number[]): Promise<NhanifyPlaylist[]> {
    const queryParams = playlistsId.map(idValue => `id=${idValue}`).join('&');
    const response = await fetch(`${auth.HOST}/api/playlists?${queryParams}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${auth.NHANIFY_API_KEY}`,
            'User-Id': auth.NHANCODES_ID,
        },
    });
    if (!response.ok) return [];
    const playlists: PlaylistAPI[] = (await response.json()).playlists;
    console.log(playlists);
    const filterPlaylists = playlists.filter(playlist => playlist.songCount > 0);
    const playlistsTrans = filterPlaylists.map((playlist) => {
        return {
            id: playlist.id,
            title: playlist.title,
            creator: playlist.creator.username
        };

    });
    console.log({ playlistsTrans });
    return playlistsTrans;
}

async function getPublicPlaylists() {
    const response = await fetch(`${auth.HOST}/api/playlists/public`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${auth.NHANIFY_API_KEY}`,
            'User-Id': auth.NHANCODES_ID,
        },
    });
    const result = await response.json();
    //fitlter out playlist with 0 songs 
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