import http from 'node:http';
import puppeteer from 'puppeteer';

const port = Number(process.env.PORT || 8787);
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.goto(process.env.APP_URL || 'http://127.0.0.1:5173/', { waitUntil: 'networkidle2' });

const send = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true });
    if (req.method === 'GET' && req.url === '/state') return send(res, 200, await page.evaluate(() => ({ title: document.querySelector('h2')?.textContent, tables: [...document.querySelectorAll('select option')].map(o => o.textContent), quickAccess: document.querySelector('aside')?.textContent }))); 
    if (req.method === 'POST' && req.url === '/roll') { await page.locator('button').filter({ text: 'Roll d100' }).click(); return send(res, 200, await page.evaluate(() => ({ result: document.querySelector('.result')?.textContent }))); }
    if (req.method === 'POST' && req.url === '/favourite') { await page.locator('button[aria-label="Favourite table"]').click(); return send(res, 200, await page.evaluate(() => ({ quickAccess: document.querySelector('aside')?.textContent }))); }
    send(res, 404, { error: 'Not found' });
  } catch (error) { send(res, 500, { error: error.message }); }
});
server.listen(port, () => console.log(`Puppeteer test tools: http://127.0.0.1:${port}`));
process.on('SIGINT', async () => { await browser.close(); server.close(); });
