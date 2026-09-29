const http = require('http');

const routes = [
  '/',
  '/requests',
  '/initiator/intent',
  '/transactions',
  '/transactions/0xbbd0176291d62b32c3e096d0314c0fab6bcfa9131c1b26a825b3ce994e645f5e',
  '/demo-video',
  '/evidence'
];

async function checkRoute(r) {
  return new Promise((resolve) => {
    http.get('http://localhost:3000' + r, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ route: r, status: res.statusCode, length: data.length });
      });
    }).on('error', (e) => resolve({ route: r, error: e.message }));
  });
}

(async () => {
  console.log('Smoke Testing Web Routes on http://localhost:3000:');
  let allPass = true;
  for (const r of routes) {
    const res = await checkRoute(r);
    const ok = res.status === 200;
    if (!ok) allPass = false;
    console.log(`  ${r.padEnd(72)} -> ${res.status || 'ERROR: ' + res.error} (${res.length || 0} bytes) [${ok ? 'OK' : 'FAIL'}]`);
  }
  if (!allPass) {
    console.error('Some routes did not return 200');
    process.exit(1);
  } else {
    console.log('All routes returned 200 OK successfully.');
  }
})();
