import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3099');

ws.on('error', console.error);

ws.on('open', function open() {
    const data = { action: "finished" };
    ws.send(JSON.stringify(data));
});

ws.on('message', function message(message) {
    try {
        const data = JSON.parse(message.toString());
        switch (data.type) {
            case "chat":
                console.log('received chat: ', data.queue.title);
                break;
            case "nhanify":
                // have a div for playlist name and creator 
                console.log('recieved nhanify:', data.queue.title)
        }
    } catch (e) {
        console.error(e);
    }
});