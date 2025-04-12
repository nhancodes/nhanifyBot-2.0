## Nhanify Bot
A twitch music bot that takes youtube song requests during stream and gives the option to fetch playlists from [Nhanify](www.nhanify.com).

### Features
1. **Browser overlay**:  Dislays the current song queue.
   - Style customization for font, color, etc.
2. **Chat and Nhanify Queue**: Toggles between the chat and Nhanify queue.
   - Chat Queue: Song queue of request made during stream.
   - Nhanify Queue: Song queue of specified or public playlists from Nhanify.
3. **General Commands**: Commands' permissions can be configure to broadcaster-only.
   - Song request, skip song, song, pause song, resume song
4. **Nhanify Commands**: Optional commands that come along with Nhanify.
   - Save song: Saves the playing song on stream to user's account on Nhanify.
   - Skip playlist: Skips the playing playlist on the stream to the next Nhanify playlist.
5. **Redeems**: Enabled by default and can be configured using Twitch Creator Dashboard.
   - Song request, skip song, skip playlist, save song

## Setup Prep
1. Register application to Twitch Developer Console.
2. Create bot and broadcaster account if not already.
4. Obtain Youtube API key.
5. Sign up for Nhanify account if not already to use Nhanify queue.

## Setup
1. Install Node version...
2. Clone repository at
3. `npm install`
4. Fill out `auth.json` file.
7. Adjust `config.json` file if needed.
8. Adjust `overlay.json` file if needed.
9. `npm run start`

## Feeback and Issues
Report issues here on Github on the issues tab or on discord (link) 
   

