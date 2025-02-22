import http, { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const PUBLIC_DIR = path.join(__dirname, '..', 'public'); // Moving up from server to public
const INDEX_FILE = path.join(PUBLIC_DIR, 'index.html');
console.log({ PUBLIC_DIR, INDEX_FILE });
const PORT = 3099;

// Create an HTTP server
export const webServer = http.createServer((req: IncomingMessage, res: ServerResponse) => {
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
webServer.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});