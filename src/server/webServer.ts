import http, { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import auth from '../auth.json' with {type: 'json'};
import { CreateResponse } from '../twitch/types.js';
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public'); // Moving up from server to public
const INDEX_FILE = path.join(PUBLIC_DIR, 'index.html');

let resolveCodePromiseBot: (result: CreateResponse) => void;
let tokenPromiseBot = new Promise((resolve) => {
    resolveCodePromiseBot = resolve;
});

let resolveCodePromiseBroadcaster: (result: CreateResponse) => void;
let tokenPromiseBroadcaster = new Promise((resolve) => {
    resolveCodePromiseBroadcaster = resolve;
});

// Create an HTTP server
export const webServer = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const pathname = url.pathname;
    let code = url.searchParams.get('code');
    let userId = url.searchParams.get('state')?.split('-')[1];
    let scope = url.searchParams.get('state')?.split('-')[2];
    if (url.pathname === '/favicon.ico') {
        res.writeHead(204);
        return res.end();
    }
    if (pathname === '/' && code) {
        console.log("Twitch authentication code recieved.");
        return;
    }
    if (pathname === '/authorize') {
        if (code) {
            const payload: { [key: string]: string } = {
                client_id: auth.CLIENT_ID,
                client_secret: auth.CLIENT_SECRET,
                code: code,
                grant_type: "authorization_code",
                redirect_uri: `http://localhost:${auth.WEB_SERVER_PORT}/authorize`,
            };
            const response = await fetch("https://id.twitch.tv/oauth2/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams(payload).toString(),
            });
            const createResponse = response.ok ? { type: "data", data: await response.json() } as CreateResponse : { type: "error", error: await response.json() } as CreateResponse;
            if (createResponse.type === "data") {
                try {
                    const response = await fetch('https://id.twitch.tv/oauth2/validate', {
                        method: 'GET',
                        headers: { 'Authorization': 'OAuth ' + createResponse.data.access_token }//not long valid
                    });
                    const authBody = await response.json();

                    if (authBody.user_id === userId) {
                        if (scope === 'chat:read chat:edit') {
                            // passing in the valid token 
                            resolveCodePromiseBot(createResponse);
                        } else {
                            resolveCodePromiseBroadcaster(createResponse);
                        }
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        return res.end('<h1>auth successful</h1><p>You can close this window.</p>');
                    } else {
                        res.writeHead(400, { 'Content-Type': 'text/html' });
                        return res.end(`
                            <!DOCTYPE html>
                            <html lang="en">
                            <head>
                                <meta charset="UTF-8">
                                <title>Authentication</title>
                            </head>
                            <body>
                                <script defer>
                                    if (window.confirm('Please authenticate with user id : ${userId}. Reauthenticate with the correct user id account?')) {
                                        window.location.href = "https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${auth.CLIENT_ID}&redirect_uri=http://localhost:${auth.WEB_SERVER_PORT}/authorize&force_verify=true&scope=${scope}&state=c3ab8aa609ea11e793ae92361f002671-${userId}-${scope}&nonce=c3ab8aa609ea11e793ae92361f002671";

                                    } else {
                                        const p = document.createElement("p");
                                        const h1 = document.createElement("h1");
                                        h1.textContent = "Sorry you gave up on the setup. :(";
                                        p.textContent = "Hope you are able to try again some other time.";

                                        document.body.appendChild(h1, p);
                                    }
                                </script>
                            </body>
                            </html>
                        `);
                    }
                } catch (e) {
                    console.error(e);
                    return;
                }
            } else {
                if (scope === 'chat:read chat:edit') {
                    resolveCodePromiseBot(createResponse);
                } else {
                    resolveCodePromiseBroadcaster(createResponse);
                }
                res.writeHead(400, { 'Content-Type': 'text/html' });
                return res.end('<h1>Auth successful</h1><p>Bad Request.</p>');
            }
        } else {
            res.writeHead(400);
            return res.end('Something went wrong with authorization: Missing code');
        }
    }
    // Set the file path based on the requested URL
    let filePath = req.url === '/' ? INDEX_FILE : path.join(PUBLIC_DIR, req.url || '');

    const extname = path.extname(filePath);

    // Ensure the file is inside the public directory
    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/html' });
        return res.end('<h1>403 Forbidden</h1>');
    }

    // Use fs.stat instead of fs.exists to check if the file exists
    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            return res.end('<h1>404 Not Found</h1>');
        }

        // Set mime types for different file extensions
        const mimeTypes: { [key: string]: string } = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.gif': 'image/gif',
            '.json': 'application/json',
            '.ico': 'image/x-icon'
        };

        // Get the correct mime type based on the file extension
        const contentType = mimeTypes[extname] || 'application/octet-stream';

        // Read the file from the filesystem
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/html' });
                return res.end('<h1>500 Internal Server Error</h1>');
            }

            // Send the file with the correct content type
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
    });
});

// Start the server and listen on the specified port
webServer.listen(auth.WEB_SERVER_PORT, () => {
    console.log(`Server running at http://localhost:${auth.WEB_SERVER_PORT}`);
});
export { tokenPromiseBot, tokenPromiseBroadcaster }