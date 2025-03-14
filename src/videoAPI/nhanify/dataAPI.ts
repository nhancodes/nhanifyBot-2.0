//for nhanify
//update add song to invalidate videos that can't be play on the player
//when loading the playlist check all songs to see if they still exist if not render the song grey and have the player skip the song

//run when application first runs
//set playlistIndex to 0
//make api call to get all public playlists and randomize

import auth from '../../auth.json' with {type: 'json'};
let playlistIndex = 0; 
let playlists: any = [];
const nhanifyPlaylists = {
     async getPublicPlaylists() {
        const response = await fetch("https://www.nhanify.com/api/playlists/public", {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${auth.NHANIFY_API_KEY}`,
                'User-Id': auth.NHANCODES_ID,
            },
        });
        return response.json();
    },
    nextPlaylist() {
        playlistIndex += 1;
    },
    getPlaylist(playlists:any) {
        return playlists[playlistIndex];
    }
}
//if chatQueues is empty
//if the playlist at current index is empty (no songs)
    // increment by playlistIndex  mod playlistLength 
    // make api call to get all the songs on the next playlist
    // set the nhanify playlist queue to the new songs
// get nhanify playlist
// remove song from nhanify playlist