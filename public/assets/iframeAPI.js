// Load the YouTube IFrame API
var tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName("script")[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// Player variable
var player;
var playerErrors = 0;
const MAX_ERRORS = 5; // Maximum consecutive errors before giving up
const ERROR_COOLDOWN = 5000; // Wait 5 seconds before retrying after error

// YouTube API error codes and descriptions
const errorCodes = {
  2: "Invalid parameter value",
  5: "HTML5 player error",
  100: "Video not found or removed",
  101: "Video embedding not allowed",
  150: "Video embedding not allowed (same as 101)"
};

// Called when YouTube API loads
function onYouTubeIframeAPIReady() {
  console.log("YouTube IFrame API ready");
  createPlayer();
}

// Create the YouTube player
function createPlayer() {
  try {
    player = new YT.Player("player", {
      height: "auto",
      width: "100%",
      playerVars: {
        playsinline: 1,
        enablejsapi: 1,
        autoplay: 1,
        iv_load_policy: 3, // Hide annotations
        rel: 0 // Don't show related videos
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
        onError: onPlayerError,
      },
    });
  } catch (error) {
    console.error("Error creating YouTube player:", error);
    setTimeout(createPlayer, ERROR_COOLDOWN);
  }
}

// Called when player is ready
function onPlayerReady(event) {
  console.log("YouTube player ready");
  playerErrors = 0; // Reset error count when player is successfully ready
  
  // Notify server that player is ready
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify({ action: "ready", data: null }));
    } catch (error) {
      console.error("Error sending ready status to server:", error);
    }
  } else {
    console.warn("WebSocket not ready, cannot send ready status");
    // Queue the ready message to be sent when WebSocket connects
    window.pendingReady = true;
  }
}

// Handle player state changes
function onPlayerStateChange(event) {
  switch (event.data) {
    case YT.PlayerState.ENDED:
      console.log("Video ended");
      notifyVideoEnded();
      break;
    case YT.PlayerState.PLAYING:
      console.log("Video playing");
      break;
    case YT.PlayerState.PAUSED:
      console.log("Video paused");
      break;
    case YT.PlayerState.BUFFERING:
      console.log("Video buffering");
      break;
    case YT.PlayerState.CUED:
      console.log("Video cued");
      break;
  }
}

// Handle player errors
function onPlayerError(event) {
  playerErrors++;
  const errorMessage = errorCodes[event.data] || `Unknown error (${event.data})`;
  console.error(`YouTube player error: ${errorMessage} (${playerErrors}/${MAX_ERRORS})`);
  
  // If we've hit the error limit, show an error message
  if (playerErrors >= MAX_ERRORS) {
    console.error("Too many player errors, giving up on this video");
    // Update UI to show error state
    const curSongCard = document.querySelector(".curSongCard");
    if (curSongCard) {
      curSongCard.innerHTML = `<div class="playerError">Video playback error: ${errorMessage}</div>`;
    }
  }
  
  // Notify server about the error
  notifyVideoEnded();
}

// Send message to server that current video has ended/failed
function notifyVideoEnded() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(
        JSON.stringify({
          action: "finished",
          queue: { type: window.queue?.type || "unknown" },
        })
      );
    } catch (error) {
      console.error("Error notifying server about video end:", error);
    }
  } else {
    console.warn("WebSocket not connected, couldn't notify about video end");
  }
}

// Expose player control methods that can be called from outside
window.playerControls = {
  play: function() {
    if (player && typeof player.playVideo === 'function') {
      player.playVideo();
    }
  },
  
  pause: function() {
    if (player && typeof player.pauseVideo === 'function') {
      player.pauseVideo();
    }
  },
  
  stop: function() {
    if (player && typeof player.stopVideo === 'function') {
      player.stopVideo();
    }
  },
  
  loadVideo: function(videoId) {
    if (player && typeof player.loadVideoById === 'function') {
      playerErrors = 0; // Reset error count for new video
      player.loadVideoById(videoId);
    }
  },
  
  getCurrentTime: function() {
    if (player && typeof player.getCurrentTime === 'function') {
      return player.getCurrentTime();
    }
    return 0;
  },
  
  getDuration: function() {
    if (player && typeof player.getDuration === 'function') {
      return player.getDuration();
    }
    return 0;
  },
  
  getState: function() {
    if (player && typeof player.getPlayerState === 'function') {
      return player.getPlayerState();
    }
    return -1;
  }
};

// Check if WebSocket connection is established when player is ready
setInterval(() => {
  if (window.pendingReady && ws && ws.readyState === WebSocket.OPEN) {
    console.log("Sending delayed ready message");
    ws.send(JSON.stringify({ action: "ready", data: null }));
    window.pendingReady = false;
  }
}, 1000);