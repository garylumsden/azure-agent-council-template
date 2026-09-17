import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const port = 4317;
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/fixture.js', ['fixture.js', 'text/javascript; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']]
]);

const server = createServer(async (request, response) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end('Method not allowed');
    return;
  }
  const host = request.headers.host;
  if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) {
    response.writeHead(403).end('Loopback host required');
    return;
  }
  const entry = files.get((request.url ?? '/').split('?')[0]);
  if (!entry) {
    response.writeHead(404).end('Not found');
    return;
  }
  try {
    const body = await readFile(new URL(entry[0], import.meta.url));
    response.writeHead(200, { 'Content-Type': entry[1] }).end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    console.error('Could not read a prototype asset:', error.code);
    response.writeHead(500).end('The prototype asset could not be loaded. Check the local server log.');
  }
});
server.on('error', error => {
  console.error(`Prototype server failed: ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`Debate design lab: http://127.0.0.1:${port}`));
