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
        const { action, queue } = JSON.parse(event.data);
        window.queue = queue;
        const firstVideo = queue.videos.shift();
        const songsDiv = document.querySelector('.songsDiv');
        const curSongCard = document.querySelector('.curSongCard');
        const curSongImg = e('img', { src: '../img/play.png', alt: "Playing" });
        switch (action) {
            case "play":
                document.getElementById('queue').textContent = queue.type;
                songsDiv.replaceChildren();
                curSongCard.replaceChildren();
                if (queue.type === "nhanify") {
                    //show the nhanify playlist description
                    console.log('recieved nhanify:', { queue })
                    const [titleEl, creatorEl] = document.getElementById('nhanifyDis')?.children ?? [];
                    if (titleEl && creatorEl) {
                        titleEl.textContent = queue.title;
                        creatorEl.textContent = queue.creator;
                    }
                }
                //create current song card
                if (firstVideo) {
                    curSongCard.append(
                        curSongImg,
                        e("div", { class: "curSongCardDisc" }, e('p', {}, firstVideo.title))
                    );
                    curSongCard.style.padding = "0.5rem";
                    queue.videos.forEach(song => addSongCard(song, "songCard", songsDiv));
                    //play the song
                    playVideo(firstVideo.id);
                } else {
                    curSongCard.style.padding = "0rem";
                    document.querySelector('.curSongCardDisc').remove();
                }
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