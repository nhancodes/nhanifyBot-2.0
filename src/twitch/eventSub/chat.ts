import auth from '../../auth.json' with {type: 'json'};
import { updateAuth } from '../../auth.js';
export default async function sendChatMessage(chatMessage: string) {
    try {
        let response = await fetch('https://api.twitch.tv/helix/chat/messages', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + auth.BOT_TWITCH_TOKEN,
                'Client-Id': auth.CLIENT_ID,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                broadcaster_id: auth.BROADCASTER_ID,
                sender_id: auth.BOT_ID,
                message: chatMessage
            })
        });
        if (response.status != 200) {
            throw new Error(`${response.status}: Failed to send chat message`);
        }
        let data = await response.json();
        if (data.data[0].is_sent) console.log(`Sent chat message: ${chatMessage} `);
    } catch (e: any) {
        if (e.message === "401: Failed to send chat message") {
            console.error(e.message);
            await updateAuth('bot', auth.BOT_REFRESH_TWITCH_TOKEN);
            sendChatMessage(chatMessage);
        } else {
            console.error(e);
        }
    }
}