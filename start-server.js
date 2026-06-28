const http = require('http');
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const port = 8080;
const mime = {'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
http.createServer((req,res) => {
  let u = req.url.split('?')[0];
  if (u === '/') u = '/index.html';
  const fp = path.join(root, u);
  if (!fp.startsWith(root)) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(fp, (e, d) => {
    if (e) { res.writeHead(404); res.end('Not found: '+u); return; }
    res.writeHead(200, {'Content-Type': mime[path.extname(fp)] || 'application/octet-stream'});
    res.end(d);
  });
}).listen(port, () => console.log('Server: http://localhost:'+port));
