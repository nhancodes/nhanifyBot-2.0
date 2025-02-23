const ws = new WebSocket('ws://localhost:3099');

ws.onerror = function (error) {
    console.log("WebSocket error:", error);
};


ws.onclose = function (event) {
    console.log("WebSocket connection closed:", event);
}

ws.onopen = function (_event) {
    console.log("WebSocket connection opened.");
    ws.send(JSON.stringify({ action: "websocketConnected", data: null }));
};

ws.onmessage = function (event) {
    try {
        console.log("EVENT", event);
        const data = JSON.parse(event.data);
        window.queue = data.queue;
        const queue = data.queue;
        console.log("QUEUE", queue);
        console.log("VIDEOS", queue.videos);
        const firstVideo = queue.videos.shift();
        console.log("HERE____________________________", { firstVideo, queue }, window.queue);
        const songsDiv = document.getElementsByClassName('songsDiv')[0];
        const curSongCard = document.getElementsByClassName('curSongCard')[0];
        const curSongImg = document.createElement('img');
        curSongImg.setAttribute("src", "../img/play.png");
        curSongImg.setAttribute("alt", "Playing");
        switch (data.action) {
            case "play":
                document.getElementById('queue').textContent = queue.type;
                songsDiv.innerHTML = '';
                curSongCard.innerHTML = '';
                if (queue.type === "nhanify") {
                    //show the nhanify playlist description
                    console.log('recieved nhanify:', { queue })
                    document.getElementById('nhanifyDis').children[0].textContent = queue.title;
                    document.getElementById('nhanifyDis').children[1].textContent = queue.creator;
                }
                //create current song card
                curSongCard.appendChild(curSongImg);
                curSongCard.setAttribute("style", "padding:.5rem");
                addSongCard(firstVideo, "curSongCardDisc", curSongCard);
                document.querySelector('.curSongCard .curSongCardDisc p').textContent = firstVideo.title;

                queue.videos.forEach(song => addSongCard(song, "songCard", songsDiv));
                //play the song
                playVideo(firstVideo.id);
                break;
            case "add":
                // render the vid to the queue
                // start the cooldown
                break;
            case "pause":
                // pause the vid
                break;
            case "resume":
                // resume the vid
                break;
        }
    } catch (e) {
        console.error(e);
    }
};