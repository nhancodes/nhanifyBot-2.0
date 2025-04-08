import http, { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import auth from '../auth.json' with {type: 'json'};
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public'); // Moving up from server to public
const INDEX_FILE = path.join(PUBLIC_DIR, 'index.html');
let resolveCodePromise: (result: {type: string; body: {access_token: string; refresh_token: string}}) => void; 
const tokenPromise = new Promise((resolve) => {
    resolveCodePromise = resolve;
});
// Create an HTTP server
export const webServer = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {

    const url = new URL(req.url!, auth.REDIRECT_URI);
    console.log({url});
    if (url.pathname === '/favicon.ico') {
        res.writeHead(204);
        return res.end();
    }
    if (url.pathname === '/') {
        const code = url.searchParams.get('code');
        console.log("IN HTTP SERVER", code);
        if (code) {
            const payload: {[key:string]: string} = {
                client_id: auth.CLIENT_ID,
                client_secret: auth.CLIENT_SECRET,
                code: code,
                grant_type: "authorization_code",
                redirect_uri: auth.REDIRECT_URI,
              };
              const response = await fetch("https://id.twitch.tv/oauth2/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams(payload).toString(),
              });
              const body = await response.json() as {access_token: string; refresh_token: string}
              console.log({body});
              if (response.ok) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('<h1>Auth successful</h1><p>You can close this window.</p>');
                resolveCodePromise({ type: "data", body });
                return;
              } else {
                res.writeHead(400, { 'Content-Type': 'text/html' });
                res.end('<h1>Auth successful</h1><p>Bad Request.</p>');
                resolveCodePromise({ type: "error", body });
                return;
              }
        } else {
            res.writeHead(400);
            res.end('Missing code');
            return;

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
export {tokenPromise}