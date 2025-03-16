const ws = new WebSocket("ws://localhost:3099");

ws.onerror = function (error) {
  console.log("WebSocket error:", error);
};

ws.onclose = function (event) {
  console.log("WebSocket connection closed:", event);
};

ws.onopen = function (_event) {
  console.log("WebSocket connection opened.");
  ws.send(JSON.stringify({ action: "websocketConnected", data: null }));
};

ws.onmessage = function (event) {
  try {
    const { action, queue } = JSON.parse(event.data);
    const songsDiv = document.querySelector(".songsDiv");
    switch (action) {
      case "emptyQueues": {
        window.queue = queue;
        document.getElementById("queue").textContent = "Chat Queue";
        //clear the playlist current card and description
        const curSongCard = document.querySelector(".curSongCard");
        curSongCard.replaceChildren();
        curSongCard.style.padding = "0rem";
        document.querySelector("#nhanifyDis").innerHTML = "";
        player.stopVideo();
        break;
      }
      case "play":
        window.queue = queue;
        const curSongCard = document.querySelector(".curSongCard");
        const curSongImg = e("img", {
          src: "/assets/img/play.png",
          alt: "Playing",
        });
        const firstVideo = queue.videos.shift();
        const nhanifyDis = document.querySelector("#nhanifyDis");
        document.getElementById("queue").textContent = queue.type;
        songsDiv.replaceChildren();
        curSongCard.replaceChildren();
        nhanifyDis.replaceChildren();
        if (queue.type === "nhanify") {
          //show the nhanify playlist description
          console.log("recieved nhanify:", { queue });
          nhanifyDis.append(e("p", {}, queue.title), e("p", {}, queue.creator));
        }
        //create current song card
        if (!firstVideo) {
          curSongCard.style.padding = "0rem";
          nhanifyDis.innerHTML = "";
          return;
        }

        curSongCard.append(
          curSongImg,
          e("div", { class: "curSongCardDisc" }, e("p", {}, firstVideo.title))
        );
        curSongCard.style.padding = "0.5rem";
        queue.videos.forEach((song) => addSongCard(song, "songCard", songsDiv));
        //play the song
        player.loadVideoById(firstVideo.videoId);
        break;
      case "add":
        console.log("ADD", { queue });
        console.log("ADD", window.queue);
        if (!window.queue) {
          //null
          return ws.send(JSON.stringify({ action: "finished" }));
        }
        songsDiv.replaceChildren();

        const videos =
          window.queue.type === "chat" ? queue.videos.slice(1) : queue.videos;
        videos.forEach((song) => addSongCard(song, "songCard", songsDiv));
        // start the cooldown
        break;
      case "bot2pause":
        if (window.queue) {
          player.pauseVideo();
          ws.send(JSON.stringify({ action: "pause" }));
          const curSongImg = document.querySelector(".curSongCard img");
          curSongImg.setAttribute("src", "/assets/img/pause.png");
        }
        break;
      case "bot2resume":
        if (window.queue) {
          player.playVideo();
          ws.send(JSON.stringify({ action: "resume" }));
          const curSongImg = document.querySelector(".curSongCard img");
          curSongImg.setAttribute("src", "/assets/img/play.png");
        }
        break;
    }
  } catch (e) {
    console.error(e);
  }
};
