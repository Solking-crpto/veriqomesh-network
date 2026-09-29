import http from 'http';

function checkUrl(path) {
  return new Promise((resolve) => {
    http.get('http://localhost:3000' + path, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        const link = body.match(/<link[^>]+rel=["']stylesheet["'][^>]*>/i);
        resolve({
          path,
          status: res.statusCode,
          hasCss: Boolean(link),
          hasApprovedVerifier: body.includes('0xb064d69428B9838C2a3e408cF995ea8eb5182c48'),
          cssTag: link ? link[0] : null
        });
      });
    });
  });
}

async function run() {
  const r1 = await checkUrl('/requests');
  console.log('/requests check:', r1);
  const r2 = await checkUrl('/initiator/intent');
  console.log('/initiator/intent check:', r2);
  const r3 = await checkUrl('/transactions');
  console.log('/transactions check:', r3);
}
run();
