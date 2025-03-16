//for nhanify
//update add song to invalidate videos that can't be play on the player
//when loading the playlist check all songs to see if they still exist if not render the song grey and have the player skip the song

//run when application first runs
//set playlistIndex to 0
//make api call to get all public playlists and randomize

import auth from '../../auth.json' with {type: 'json'};
import { NhanifyPlaylist, NhanifyQueue, YTVideo } from '../types.js';
export const nhanify = {
    playlistIndex: 0, 
    playlists:  await getPublicPlaylists(),
    nextPlaylist() {
        this.playlistIndex += 1;
    },
    getPlaylist():NhanifyPlaylist {
        return this.playlists[this.playlistIndex % this.playlists.length]; //0 % 4 4 % 4
    },
    async getSongs():Promise<YTVideo[]>{
        const id = this.getPlaylist().id;
        const response = await fetch(`http://localhost:3002/api/playlists/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${auth.NHANIFY_API_KEY}`,
                'User-Id': auth.NHANCODES_ID,
            },
        });
        const playlist = await response.json();
        return shuffleItems(playlist.songs) as YTVideo[];
    }
}

async function getPublicPlaylists(){
const response = await fetch("http://localhost:3002/api/playlists/public", {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${auth.NHANIFY_API_KEY}`,
        'User-Id': auth.NHANCODES_ID,
    },
});
const result = await response.json();
//fitlter out playlist with 0 songs 
console.log("UNFILTERED", result.playlists);
const filteredPlaylists = result.playlists.filter((playlist: { songCount: number; }) => playlist.songCount > 0);
const playlists = filteredPlaylists.map((playlist: { id: number; title: string; creator: { username: string; }; }) => {
    return { 
        id: playlist.id, 
        title: playlist.title,
        creator: playlist.creator.username
    }
});
console.log("FILTERED", playlists);
return shuffleItems(playlists) as NhanifyPlaylist[];
}

function shuffleItems(items: NhanifyPlaylist[] | YTVideo[]) {
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1)); // Random index from 0 to i
        [items[i], items[j]] = [items[j], items[i]]; // Swap elements
    }
    return items;
}