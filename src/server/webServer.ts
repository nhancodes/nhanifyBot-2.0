import http, { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import auth from '../auth.json' with {type: 'json'};

// Directory paths
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public'); // Moving up from server to public
const INDEX_FILE = path.join(PUBLIC_DIR, 'index.html');

// Set up promise resolvers for token acquisition
let resolveCodePromiseBot: (result: { type: string; body: { access_token: string; refresh_token: string } }) => void;
let tokenPromiseBot = new Promise((resolve) => {
    resolveCodePromiseBot = resolve;
});

let resolveCodePromiseBroadcaster: (result: { type: string; body: { access_token: string; refresh_token: string } }) => void;
let tokenPromiseBroadcaster = new Promise((resolve) => {
    resolveCodePromiseBroadcaster = resolve;
});

// Define MIME types for different file extensions
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

// Create an HTTP server
export const webServer = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
        if (!req.url || !req.headers.host) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            return res.end('<h1>400 Bad Request</h1>');
        }
        
        const url = new URL(req.url, `http://${req.headers.host}`);
        const pathname = url.pathname;
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const userId = state?.split('-')[1];
        const scope = state?.split('-')[2];
        
        // Handle favicon requests
        if (url.pathname === '/favicon.ico') {
            res.writeHead(204);
            return res.end();
        }
        
        // Handle root path with code (initial redirect from Twitch auth)
        if (pathname === '/' && code) {
            console.log("Twitch authentication code received.");
            res.writeHead(302, { 'Location': '/authorize?code=' + code + '&state=' + state });
            return res.end();
        }
        
        // Handle authorization path
        if (pathname === '/authorize') {
            return handleAuthorization(req, res, code, userId, scope);
        }
        
        // Handle static file requests
        serveStaticFile(req, res);
    } catch (error) {
        console.error('Error handling HTTP request:', error);
        res.writeHead(500, { 'Content-Type': 'text/html' });
        return res.end('<h1>500 Internal Server Error</h1>');
    }
});

/**
 * Handle Twitch authorization flow
 */
async function handleAuthorization(req: IncomingMessage, res: ServerResponse, code: string | null, userId: string | undefined, scope: string | undefined) {
    if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        return res.end('Something went wrong with authorization: Missing code');
    }
    
    try {
        // Exchange code for token
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
        
        const body = await response.json() as {
            access_token: string;
            refresh_token: string;
            scope: string[];
            error?: string;
            message?: string;
        };
        
        if (!response.ok) {
            console.error('Token exchange failed:', body);
            
            // Resolve promises with error
            if (scope === 'chat:read chat:edit') {
                resolveCodePromiseBot({ type: "error", body });
            } else {
                resolveCodePromiseBroadcaster({ type: "error", body });
            }
            
            res.writeHead(400, { 'Content-Type': 'text/html' });
            return res.end(`<h1>Authorization Failed</h1><p>${body.message || 'Token exchange failed'}</p>`);
        }
        
        // Validate the token and check user ID
        try {
            const validationResponse = await fetch('https://id.twitch.tv/oauth2/validate', {
                method: 'GET',
                headers: { 'Authorization': 'OAuth ' + body.access_token }
            });
            
            const authBody = await validationResponse.json();
            
            if (!validationResponse.ok) {
                console.error('Token validation failed:', authBody);
                
                // Resolve promises with error
                if (scope === 'chat:read chat:edit') {
                    resolveCodePromiseBot({ type: "error", body });
                } else {
                    resolveCodePromiseBroadcaster({ type: "error", body });
                }
                
                res.writeHead(400, { 'Content-Type': 'text/html' });
                return res.end(`<h1>Authorization Failed</h1><p>${authBody.message || 'Token validation failed'}</p>`);
            }
            
            // Check if token is for the expected user
            if (authBody.user_id === userId) {
                // Token is valid and for the expected user
                if (scope === 'chat:read chat:edit') {
                    resolveCodePromiseBot({ type: "data", body });
                } else {
                    resolveCodePromiseBroadcaster({ type: "data", body });
                }
                
                res.writeHead(200, { 'Content-Type': 'text/html' });
                return res.end('<h1>Authorization Successful</h1><p>You can close this window.</p>');
            } else {
                // Token is for the wrong user
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
                            if (window.confirm('Please authenticate with user id: ${userId}. Reauthenticate with the correct user id account?')) {
                                window.location.href = "https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${auth.CLIENT_ID}&redirect_uri=http://localhost:${auth.WEB_SERVER_PORT}/authorize&force_verify=true&scope=${scope}&state=c3ab8aa609ea11e793ae92361f002671-${userId}-${scope}&nonce=c3ab8aa609ea11e793ae92361f002671";
                            } else {
                                const p = document.createElement("p");
                                const h1 = document.createElement("h1");
                                h1.textContent = "Sorry you gave up on the setup.";
                                p.textContent = "Hope you are able to try again some other time.";
                                document.body.appendChild(h1);
                                document.body.appendChild(p);
                            }
                        </script>
                    </body>
                    </html>
                `);
            }
        } catch (error) {
            console.error('Error during token validation:', error);
            
            // Resolve promises with error
            if (scope === 'chat:read chat:edit') {
                resolveCodePromiseBot({ type: "error", body: { access_token: '', refresh_token: '', error: 'validation_failed', message: 'Token validation failed' } });
            } else {
                resolveCodePromiseBroadcaster({ type: "error", body: { access_token: '', refresh_token: '', error: 'validation_failed', message: 'Token validation failed' } });
            }
            
            res.writeHead(500, { 'Content-Type': 'text/html' });
            return res.end('<h1>Authorization Error</h1><p>An error occurred during token validation.</p>');
        }
    } catch (error) {
        console.error('Error during authorization:', error);
        
        // Resolve promises with error
        if (scope === 'chat:read chat:edit') {
            resolveCodePromiseBot({ type: "error", body: { access_token: '', refresh_token: '', error: 'server_error', message: 'Server error during authorization' } });
        } else {
            resolveCodePromiseBroadcaster({ type: "error", body: { access_token: '', refresh_token: '', error: 'server_error', message: 'Server error during authorization' } });
        }
        
        res.writeHead(500, { 'Content-Type': 'text/html' });
        return res.end('<h1>Server Error</h1><p>An error occurred during authorization.</p>');
    }
}

/**
 * Serve static files with proper MIME types and security checks
 */
function serveStaticFile(req: IncomingMessage, res: ServerResponse) {
    // Set the file path based on the requested URL
    let filePath = req.url === '/' ? INDEX_FILE : path.join(PUBLIC_DIR, req.url || '');
    const extname = path.extname(filePath);
    
    // Ensure the file is inside the public directory (prevent directory traversal)
    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/html' });
        return res.end('<h1>403 Forbidden</h1>');
    }
    
    // Check if file exists
    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            return res.end('<h1>404 Not Found</h1>');
        }
        
        // Get the correct mime type based on the file extension
        const contentType = mimeTypes[extname] || 'application/octet-stream';
        
        // Read and serve the file
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/html' });
                return res.end('<h1>500 Internal Server Error</h1>');
            }
            
            // Set security headers
            const headers = {
                'Content-Type': contentType,
                'X-Content-Type-Options': 'nosniff',
                'Cache-Control': 'max-age=86400' // Cache static files for 1 day
            };
            
            // Send the file with appropriate headers
            res.writeHead(200, headers);
            res.end(data);
        });
    });
}

// Start the server and listen on the specified port
webServer.listen(auth.WEB_SERVER_PORT, () => {
    console.log(`Server running at http://localhost:${auth.WEB_SERVER_PORT}`);
});

// Export the token promises
export { tokenPromiseBot, tokenPromiseBroadcaster };