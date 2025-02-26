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
        const songsDiv = document.querySelector('.songsDiv');
        switch (action) {
            case "emptyQueues": {
                window.queue = queue;
                document.getElementById('queue').textContent = "Chat Queue";
                //clear the playlist current card and description
                const curSongCard = document.querySelector('.curSongCard');
                curSongCard.replaceChildren();
                curSongCard.style.padding = "0rem";
                document.querySelector('#nhanifyDis').replaceChildren();
                break;
            }
            case "play":
                window.queue = queue;
                const curSongCard = document.querySelector('.curSongCard');
                const curSongImg = e('img', { src: '/assets/img/play.png', alt: "Playing" });
                //const curSongImg = document.createElement("span");
                const firstVideo = queue.videos.shift();
                const nhanifyDis = document.querySelector('#nhanifyDis');
                document.getElementById('queue').textContent = queue.type;
                songsDiv.replaceChildren();
                curSongCard.replaceChildren();
                if (queue.type === "nhanify") {
                    //show the nhanify playlist description
                    console.log('recieved nhanify:', { queue })
                    const [titleEl, creatorEl] = nhanifyDis?.children ?? [];
                    if (titleEl && creatorEl) {
                        titleEl.textContent = queue.title;
                        creatorEl.textContent = queue.creator;
                    }
                } else {
                    nhanifyDis.replaceChildren();
                }
                //create current song card
                if (!firstVideo) {
                    curSongCard.style.padding = "0rem";
                    nhanifyDis.remove();
                    return;
                }

                curSongCard.append(
                    curSongImg,
                    e("div", { class: "curSongCardDisc" }, e('p', {}, firstVideo.title))
                );
                curSongCard.style.padding = "0.5rem";
                queue.videos.forEach(song => addSongCard(song, "songCard", songsDiv));
                //play the song
                player.loadVideoById(firstVideo.id);
                break;
            case "add":
                if (!window.queue) {
                    ws.send(JSON.stringify({ action: "finished", queue: { type: window.queue } }));
                    return;
                }
                songsDiv.replaceChildren();

                const videos = window.queue.type === 'chat' ? queue.videos.slice(1) : queue.videos;
                videos.forEach(song => addSongCard(song, "songCard", songsDiv));
                // start the cooldown
                break;
            case "pause":

                if (window.queue) {
                    player.pauseVideo();
                    ws.send(JSON.stringify({ action: "pause", queue: { type: window.queue.type } }));
                    const curSongImg = document.querySelector('.curSongCard img');
                    curSongImg.setAttribute('src', '/assets/img/pause.png');
                }
                break;
            case "resume":
                if (window.queue) {
                    player.playVideo();
                    ws.send(JSON.stringify({ action: "resume", queue: { type: window.queue.type } }));
                    const curSongImg = document.querySelector('.curSongCard img');
                    curSongImg.setAttribute('src', '/assets/img/play.png');
                }
                break;
        }
    } catch (e) {
        console.error(e);
    }
};