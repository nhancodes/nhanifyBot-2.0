var tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName("script")[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
var player;

function onYouTubeIframeAPIReady() {
    player = new YT.Player("player", {
        height: "auto",
        width: "100%",
        playerVars: {
            playsinline: 1,
            enablejsapi: 1,
            loop: 1,
            autoplay: 1,
        },
        events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange
        },
    });
}

function onPlayerReady(_event) {
    console.log("Player ready.");
    ws.send(JSON.stringify({ action: "ready", data: null }));
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        ws.send(JSON.stringify({ action: "finished", queue: { type: window.queue.type } }));
    }
}
