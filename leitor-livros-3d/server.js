const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3050;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
    // Enable CORS and cache controls
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    let parsedUrl = decodeURIComponent(req.url.split('?')[0]);
    if (parsedUrl === '/') parsedUrl = '/index.html';

    const safePath = path.normalize(path.join(PUBLIC_DIR, parsedUrl));
    if (!safePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Acesso proibido');
        return;
    }

    fs.stat(safePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Arquivo não encontrado: ' + parsedUrl);
            return;
        }

        const ext = path.extname(safePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        // Support HTTP Range requests for fast PDF streaming and partial reading
        const range = req.headers.range;
        if (range && ext === '.pdf') {
            const total = stats.size;
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
            const chunksize = (end - start) + 1;

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${total}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': contentType
            });

            const fileStream = fs.createReadStream(safePath, { start, end });
            fileStream.pipe(res);
        } else {
            res.writeHead(200, {
                'Content-Length': stats.size,
                'Content-Type': contentType,
                'Accept-Ranges': 'bytes'
            });

            const fileStream = fs.createReadStream(safePath);
            fileStream.pipe(res);
        }
    });
});

server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`📖 Leitor de Livros 3D - Servidor Ativo!`);
    console.log(`🚀 Acesse no seu navegador: http://localhost:${PORT}`);
    console.log(`====================================================`);
});
