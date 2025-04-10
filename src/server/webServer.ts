import http, { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import auth from '../auth.json' with {type: 'json'};
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public'); // Moving up from server to public
const INDEX_FILE = path.join(PUBLIC_DIR, 'index.html');
let resolveCodePromise: (result: { type: string; body: { access_token: string; refresh_token: string } }) => void;
const tokenPromise = new Promise((resolve) => {
    resolveCodePromise = resolve;
});
// Create an HTTP server
export const webServer = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
    //console.log(req);
    console.log(req.url);
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const pathname = url.pathname;
    console.log({ pathname });
    let code = url.searchParams.get('code');
    let userId = url.searchParams.get('state')?.split(':')[1];
    console.log({ code, userId });
    if (url.pathname === '/favicon.ico') {
        res.writeHead(204);
        return res.end();
    }
    if (pathname === '/' && code) {
        console.log("auth request: ", code);
        return;
    }
    if (pathname === '/authorize') {
        console.log("IN AUTHORIZE")
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
            const body = await response.json() as { access_token: string; refresh_token: string }
            //console.log({ body });
            if (response.ok) {
                try {
                    const response = await fetch('https://id.twitch.tv/oauth2/validate', {
                        method: 'GET',
                        headers: { 'Authorization': 'OAuth ' + body.access_token }//not long valid
                    });
                    const authBody = await response.json();
                    //console.log({ body, userId });

                    if (authBody.user_id === userId) {
                        resolveCodePromise({ type: "data", body });
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        return res.end('<h1>auth successful</h1><p>You can close this window.</p>');
                    } else {
                        console.log("IN REAUTH");
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
                                        window.location.href = "https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${auth.CLIENT_ID}&redirect_uri=http://localhost:${auth.WEB_SERVER_PORT}/authorize&force_verify=true&scope=channel:manage:redemptions+channel:read:redemptions&state=c3ab8aa609ea11e793ae92361f002671:${userId}&nonce=c3ab8aa609ea11e793ae92361f002671";

                                    } else {
                                        const p = document.createElement("p");
                                        p.textContent = "Sorry you gave up on the setup, hope you are able to try again some other time :(";
                                        document.body.appendChild(p);
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
                resolveCodePromise({ type: "error", body });
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
            console.log("IN STATIC ASSETS");
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
export { tokenPromise }