"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = require("fs");
var auth_json_1 = require("./auth.json");
var EVENTSUB_WEBSOCKET_URL = 'wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=600';
// Start executing the bot from here
(function () { return __awaiter(void 0, void 0, void 0, function () {
    var websocketClient;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: 
            // Verify that the authentication is valid
            return [4 /*yield*/, getAuth()];
            case 1:
                // Verify that the authentication is valid
                _a.sent();
                websocketClient = startWebSocketClient();
                return [2 /*return*/];
        }
    });
}); })();
function startWebSocketClient() {
    var websocketClient = new WebSocket(EVENTSUB_WEBSOCKET_URL);
    console.log(websocketClient);
    websocketClient.addEventListener('error', console.error);
    websocketClient.addEventListener('open', function () {
        console.log('WebSocket connection opened to ' + EVENTSUB_WEBSOCKET_URL);
    });
    websocketClient.addEventListener('message', function (data) {
        //handleWebSocketMessage(JSON.parse(data.toString()));
    });
    return websocketClient;
}
function getAuth() {
    return __awaiter(this, void 0, void 0, function () {
        var response, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetch('https://id.twitch.tv/oauth2/validate', {
                        method: 'GET',
                        headers: {
                            'Authorization': 'OAuth ' + auth_json_1.default.BOT_TWITCH_TOKEN
                        }
                    })];
                case 1:
                    response = _a.sent();
                    if (!(response.status != 200)) return [3 /*break*/, 4];
                    return [4 /*yield*/, response.json()];
                case 2:
                    data = _a.sent();
                    console.error("Token is not valid. /oauth2/validate returned status code " + response.status);
                    console.error(data);
                    //process.exit(1);
                    return [4 /*yield*/, updateAuth(auth_json_1.default.REFRESH_TWITCH_TOKEN)];
                case 3:
                    //process.exit(1);
                    _a.sent();
                    _a.label = 4;
                case 4:
                    console.log("Validated token.");
                    return [2 /*return*/];
            }
        });
    });
}
function refreshAuthToken(REFRESH_TWITCH_TOKEN) {
    return __awaiter(this, void 0, void 0, function () {
        var payload, newToken;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log({ REFRESH_TWITCH_TOKEN: REFRESH_TWITCH_TOKEN });
                    payload = {
                        "grant_type": "refresh_token",
                        "refresh_token": REFRESH_TWITCH_TOKEN,
                        // keys are not the same as the api, might not work
                        "client_id": auth_json_1.default.CLIENT_ID,
                        "client_secret": auth_json_1.default.CLIENT_SECRET
                    };
                    return [4 /*yield*/, fetch('https://id.twitch.tv/oauth2/token', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded'
                            },
                            body: new URLSearchParams(payload).toString()
                        })];
                case 1:
                    newToken = _a.sent();
                    return [4 /*yield*/, newToken.json()];
                case 2: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
function updateAuth(REFRESH_TWITCH_TOKEN) {
    return __awaiter(this, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, refreshAuthToken(REFRESH_TWITCH_TOKEN)];
                case 1:
                    data = _a.sent();
                    console.log({ data: data });
                    if ("access_token" in data) {
                        auth_json_1.default.BOT_TWITCH_TOKEN = data.access_token;
                        auth_json_1.default.BOT_REFRESH_TWITCH_TOKEN = data.refresh_token;
                        (0, fs_1.writeFileSync)("./src/auth.json", JSON.stringify(auth_json_1.default));
                    }
                    else {
                        console.log("THE REFRESHTOKEN STATUS", data.status);
                    }
                    return [2 /*return*/];
            }
        });
    });
}
// Create WebSocket connection.
//const socket = new WebSocket("wss://eventsub.wss.twitch.tv/ws");
// Connection openedonst BOT_USER_ID = 'CHANGE_ME_TO_YOUR_BOTS_USER_ID'; // This is the User ID of the chat bot
/*
socket.addEventListener("open", (event) => {
  socket.send("Hello Server!");
});

// Listen for messages
socket.addEventListener("message", (event) => {
  console.log("Message from server ", event.data);
});
*/
