const ws = new WebSocket('ws://localhost:3099');

ws.onerror = function (error) {
    console.log("WebSocket error:", error);
};


ws.onclose = function (event) {
    console.log("WebSocket connection closed:", event);
}

ws.onopen = function (_event) {
    console.log("WebSocket connecion opened.");
    ws.send(JSON.stringify({ type: "websocketClient", data: { state: "connected" } }));
};

ws.onmessage = function (event) {
    try {
        console.log("EVENT", event);
        const data = JSON.parse(event.data).queue;
        switch (data.type) {
            case "chat":
                console.log('received chat: ', { data });
                break;
            case "nhanify":
                // have a div for playlist name and creator 
                console.log('recieved nhanify:', { data })
        }
    } catch (e) {
        console.error(e);
    }
};