## Nhanify Bot

A twitch music bot that takes youtube song requests during stream and gives the option to fetch playlists from [Nhanify](www.nhanify.com). Nhanify is a website where users curate their own playlists and shares it with others. Enabling Nhanify will allow your bot to fetch those playlists from Nhanify and play them on stream and save favorite songs on stream to Nhanify.

### Features

1. **Browser overlay**: Displays the current song queue.
   - Style customization for font, color, etc.
2. **Chat and Nhanify Queue**: Toggles between the chat and Nhanify queue.
   - Chat Queue: Song queue of request made during stream.
   - Nhanify Queue: Song queue of specified or public playlists from Nhanify.
3. **General Commands**: Commands can be configured to broadcaster-only or for all.
   - Song request, skip song, song, pause song, resume song
4. **Nhanify Commands**: Optional commands that come along with Nhanify.
   - Save song: Saves the playing song on stream to user's account on Nhanify.
   - Skip playlist: Skips the playing playlist on the stream to the next Nhanify playlist.
5. **Redeems**: Enabled by default and can be configured using Twitch Creator Dashboard.
   - Song request, skip song, skip playlist, save song

## Setup Prep

1. Create Twitch accounts that will act as your bot and broadcaster if not already.
1. Register the application on your bot account on the Twitch Developer Console.
   - [Twitch Developer Console](https://dev.twitch.tv/docs/authentication/register-app/) for instructions on how to register.
   - On step 4. of the instructions add `http://localhost:3000/authorize` as the `OAuth Redirect URL`
1. Obtain a Youtube API key to fetch data about music videos.
   - Create a Google Account if not already.
   - When logged into the account, go to [Google Console Credentials](https://console.cloud.google.com/apis/credentials).
   - Click on `+ Create credentails` and click on `API key`.
   - Under `API Keys`section click on the newly created key, go a `API restrictions`, toggle `Restrict key`, click on `Select APIs` drop down and check `YouTube Data API v3`, and click `Save`.
   - Click on `Show key` button to see your `API key` for when you need it later on in the setup process.
1. **Optional** Obtain Nhanify API key to fetch playlists and save songs.
   - Co to [Nhanify](https://www.nhanify.com/signin) and sign in with Twitch to create a Nhanify account.
   - Go to `Your Playlist`, click on `Generate API Key` to get the API key, and store the key somewhere safe.
   - Your user id can be found right above the API key. You will need this for your `auth.json` file later.

## Setup

1. [Link](https://git-scm.com/downloads) to install Git, if not already, to clone the bot application from the internet to your computer.
1. Clone bot repository using `git clone https://github.com/nonbots/nhanifyBot-2.0.git` in the terminal.
1. [Link](https://nodejs.org/en/download) to install Node.js v20.12.2 or later, if not already, to run the bot application.
1. Run `npm install` in the terminal to download all decepencies needed to run the bot application.
1. Create a copy of the `authExample.json` and rename it to `auth.json`. This file provides the credentials and information needed to run the bot.
   - Fill out all empty fields except: `BOT_TWITCH_TOKEN`, `BOT_REFRESH_TWITCH_TOKEN`, `BROADCASTER_REFRESH_TWITCH_TOKEN`, and `BROADCASTER_TWITCH_TOKEN`.
1. Create a copy of the `configExample.json` and rename it to `config.json`. This file allows you to configure the bot.
   - **enabled**
     - `true`: Enables the bot to fetch playlists from Nhanify.
     - `false`: Disables the bot from fetching playlists from Nhanify.
   - **playlistsId**:
     - `[]`: Fetches public playlists from Nhanify if `enabled` is set to `true`.
     - `[1,2,3,4]`: Fetches speficied playlists by id from Nhanify if `enabled` is set to `true`. If none of the specified playlists' id are found then no playlists will be fetch from Nhanify.
   - **VIDEO_MAX_DURATION**
     - `600`: The max duration of a video allowed to be requested on stream or fetched from Nhanify. Value is in milliseconds.
   - **ONLY_BROADCASTER**
     - `true`: Only the broadcaster can use this command.
     - `false`: The broadcaster and non-broadcaster can use this command.
   - **COMMANDS**
     - Bot actions : command name can be change as desired. Ex. songRequest: "sr"
1. Create a copy of the `overlayConfigExample.json` and rename it to `overlayConfig.json`. This file allows you to configure look of the browser overlay.
   - Change the value after the `:` to alter the look of the overlay. You can look up valid values on the internet if need be.
1. Run `npm run start` in the terminal to run the application.
1. On first run of the applicaton, a browser will open to a Twitch authenication page. Make sure to authorizate with the bot channel first. A second browser will open to authenicate the broadcaster.
1. Open a browser and navigate to the url `http://localhost:3000`. You should see the song queue and the first song should be playing, if not, click play on the video to get the queue going.
1. The url can be added to an browser source on OBS or other streaming platforms. Remember that you should only have **one** browser tab or source running on the application at one time.

## Feeback and Issues

Report issues here on Github on the issues tab or on Discord (link to be added).
