// Configuration
const RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000; // 1 second
let reconnectAttempt = 0;
let reconnectTimeout = null;

// WebSocket state
let ws = null;
let isConnected = false;

// Load user configuration from JSON file
async function loadUserConfig() {
  try {
    const response = await fetch("./assets/overlayConfig.json");
    console.log({ response });
    
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.status} ${response.statusText}`);
    }
    
    const { OVERLAYSTYLES } = await response.json();

    // Apply styles to CSS variables
    for (const key in OVERLAYSTYLES) {
      const style = `--${key.split("_").join("-")}`;
      document.documentElement.style.setProperty(style, OVERLAYSTYLES[key]);
    }
  } catch (error) {
    console.error("Error loading user config:", error);
    // Use default styles if config can't be loaded
  }
}

// Create and initialize WebSocket connection
function initWebSocket() {
  // Close existing connection if any
  if (ws) {
    try {
      ws.close();
    } catch (e) {
      console.error("Error closing existing WebSocket:", e);
    }
  }
  
  // Create new WebSocket connection
  ws = new WebSocket(`ws://${window.location.host}`);
  
  // Setup event handlers
  ws.onopen = function () {
    console.log("WebSocket connection opened.");
    isConnected = true;
    reconnectAttempt = 0;
    
    // Notify server that client is connected
    try {
      ws.send(JSON.stringify({ action: "websocketConnected", data: null }));
    } catch (e) {
      console.error("Error sending initial message:", e);
    }
    
    // Update UI to show connected state
    updateConnectionStatus(true);
  };
  
  ws.onclose = function (event) {
    console.log("WebSocket connection closed:", event);
    isConnected = false;
    
    // Update UI to show disconnected state
    updateConnectionStatus(false);
    
    // Attempt to reconnect
    attemptReconnect();
  };
  
  ws.onerror = function (error) {
    console.error("WebSocket error:", error);
    // Connection will close, triggering onclose
  };
  
  ws.onmessage = handleMessage;
}

// Try to reconnect with exponential backoff
function attemptReconnect() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }
  
  if (reconnectAttempt >= RECONNECT_ATTEMPTS) {
    console.error(`Failed to reconnect after ${RECONNECT_ATTEMPTS} attempts`);
    updateConnectionStatus(false, true);
    return;
  }
  
  const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempt);
  console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempt + 1}/${RECONNECT_ATTEMPTS})`);
  
  reconnectTimeout = setTimeout(() => {
    reconnectAttempt++;
    initWebSocket();
  }, delay);
}

// Update UI to show connection status
function updateConnectionStatus(connected, failed = false) {
  // Optional: Add visual indicator of connection status
  const statusElement = document.getElementById("connectionStatus");
  
  if (statusElement) {
    if (connected) {
      statusElement.textContent = "Connected";
      statusElement.className = "connected";
    } else if (failed) {
      statusElement.textContent = "Connection Failed";
      statusElement.className = "failed";
    } else {
      statusElement.textContent = "Disconnected";
      statusElement.className = "disconnected";
    }
  }
}

// Handle incoming WebSocket messages
function handleMessage(event) {
  try {
    const { action, queue } = JSON.parse(event.data);
    const songsDiv = document.querySelector(".songsDiv");
    
    console.log(`Received action: ${action}`);
    
    switch (action) {
      case "emptyQueues": {
        window.queue = queue;
        document.getElementById("queue").textContent = "Chat Queue";
        
        // Clear the playlist current card and description
        const curSongCard = document.querySelector(".curSongCard");
        curSongCard.replaceChildren();
        curSongCard.style.padding = "0rem";
        document.querySelector("#nhanifyDis").innerHTML = "";
        
        // Stop the video player
        if (player && typeof player.stopVideo === 'function') {
          player.stopVideo();
        } else {
          console.warn("Player not ready for stopVideo()");
        }
        break;
      }
      
      case "play": {
        window.queue = queue;
        const curSongCard = document.querySelector(".curSongCard");
        const nhanifyDis = document.querySelector("#nhanifyDis");
        
        // Create play icon
        const curSongImg = e("img", {
          src: "/assets/img/play.png",
          alt: "Playing",
        });
        
        // Get first video and update queue display
        const firstVideo = queue.videos.length > 0 ? queue.videos.shift() : null;
        document.getElementById("queue").textContent = queue.type || "No Queue";
        
        // Clear existing content
        songsDiv.replaceChildren();
        curSongCard.replaceChildren();
        nhanifyDis.replaceChildren();
        
        // Display Nhanify playlist info if applicable
        if (queue.type === "nhanify") {
          console.log("Received nhanify:", queue);
          nhanifyDis.append(
            e("p", {}, queue.title || "Unknown Playlist"),
            e("p", {}, queue.creator || "Unknown Creator")
          );
        }
        
        // Play the song if we have one
        if (!firstVideo) {
          console.warn("No video to play in queue");
          curSongCard.style.padding = "0rem";
          return;
        }
        
        // Update current song card
        curSongCard.append(
          curSongImg,
          e("div", { class: "curSongCardDisc" }, e("p", {}, firstVideo.title))
        );
        curSongCard.style.padding = "0.5rem";
        
        // Display remaining songs in queue
        if (queue.videos && queue.videos.length > 0) {
          queue.videos.forEach((song) => addSongCard(song, "songCard", songsDiv));
        }
        
        // Start playing the video
        if (player && typeof player.loadVideoById === 'function') {
          player.loadVideoById(firstVideo.videoId);
        } else {
          console.warn("Player not ready for loadVideoById()");
        }
        break;
      }
      
      case "add": {
        console.log("ADD", { queue });
        
        if (!window.queue) {
          console.warn("No active queue, can't add song");
          return ws.send(JSON.stringify({ action: "finished" }));
        }
        
        // Clear and rebuild song list
        songsDiv.replaceChildren();
        
        const videos = window.queue.type === "chat"
          ? queue.videos.slice(1)
          : queue.videos;
          
        if (videos && videos.length > 0) {
          videos.forEach((song) => addSongCard(song, "songCard", songsDiv));
        }
        break;
      }
      
      case "pauseSong": {
        if (window.queue && player) {
          if (typeof player.pauseVideo === 'function') {
            player.pauseVideo();
            ws.send(JSON.stringify({ action: "pause" }));
            
            const curSongImg = document.querySelector(".curSongCard img");
            if (curSongImg) {
              curSongImg.setAttribute("src", "/assets/img/pause.png");
            }
          } else {
            console.warn("Player not ready for pauseVideo()");
          }
        }
        break;
      }
      
      case "resumeSong": {
        if (window.queue && player) {
          if (typeof player.playVideo === 'function') {
            player.playVideo();
            ws.send(JSON.stringify({ action: "resume" }));
            
            const curSongImg = document.querySelector(".curSongCard img");
            if (curSongImg) {
              curSongImg.setAttribute("src", "/assets/img/play.png");
            }
          } else {
            console.warn("Player not ready for playVideo()");
          }
        }
        break;
      }
      
      case "error": {
        console.error("Server error:", queue?.message || "Unknown error");
        // Optional: Display error to user
        break;
      }
      
      default:
        console.warn(`Unknown action: ${action}`);
    }
  } catch (e) {
    console.error("Error processing message:", e);
  }
}

// Initialize everything when DOM is loaded
window.addEventListener("DOMContentLoaded", () => {
  // Load configuration
  loadUserConfig();
  
  // Initialize WebSocket connection
  initWebSocket();
  
  // Optional: Add connection status indicator
  const header = document.getElementById("header");
  if (header) {
    const statusElement = document.createElement("div");
    statusElement.id = "connectionStatus";
    statusElement.textContent = "Connecting...";
    header.appendChild(statusElement);
  }
});

// Heartbeat to detect disconnections
setInterval(() => {
  if (ws && isConnected) {
    try {
      ws.send(JSON.stringify({ action: "heartbeat" }));
    } catch (e) {
      console.warn("Error sending heartbeat, connection may be lost");
    }
  }
}, 30000); // Every 30 seconds