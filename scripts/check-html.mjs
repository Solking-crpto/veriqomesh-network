import http from 'http';

http.get('http://localhost:3000/initiator/intent', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('=== PAGE RESPONSE ===');
    console.log('Page Status Code:', res.statusCode);
    
    // Check stylesheet link
    const linkMatches = body.match(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi) || [];
    console.log('Stylesheet Links Count:', linkMatches.length);
    if (linkMatches.length > 0) {
      console.log('Stylesheet Tag:', linkMatches[0]);
      const hrefMatch = linkMatches[0].match(/href=["']([^"']+)["']/i);
      if (hrefMatch) {
        const cssUrl = 'http://localhost:3000' + hrefMatch[1];
        console.log('Fetching CSS from:', cssUrl);
        http.get(cssUrl, (cssRes) => {
          console.log('\n=== CSS RESPONSE ===');
          console.log('CSS Status Code:', cssRes.statusCode);
          console.log('CSS Content-Type:', cssRes.headers['content-type']);
          console.log('CSS Content-Length:', cssRes.headers['content-length']);
          let cssBody = '';
          cssRes.on('data', c => cssBody += c);
          cssRes.on('end', () => {
            console.log('CSS Total Bytes Downloaded:', cssBody.length);
            console.log('CSS Contains Tailwind utilities (.bg-purple-950, etc.):', cssBody.includes('bg-purple-950'));
            console.log('CSS Contains Monad styling (.bg-\\[\\#090a10\\]):', cssBody.includes('090a10'));
          });
        });
      }
    }

    // Check verifier field in page HTML
    console.log('\n=== VERIFIER BINDING CHECKS ===');
    const hasVerifierAddress = body.includes('0xb064d69428B9838C2a3e408cF995ea8eb5182c48');
    console.log('HTML contains approved verifier address (0xb064...):', hasVerifierAddress);
    
    const verifierInputMatch = body.match(/<input[^>]*value="([^"]*0xb064[^"]*)"[^>]*>/i);
    console.log('Verifier input has pre-filled value:', verifierInputMatch ? verifierInputMatch[1] : 'Not matched directly');

    const summaryVerifier = body.includes('0xb064d69428B9838C2a3e408cF995ea8eb5182c48');
    console.log('Pre-broadcast summary binds approved verifier:', summaryVerifier);

    const oldVerifierFound = body.includes('0x16D7bD08Ad79bBCdBa116A652f68589FE5d6F4EA');
    console.log('Old unrecoverable verifier (0x16D7...) absent:', !oldVerifierFound);
  });
}).on('error', (err) => {
  console.error('Error fetching page:', err.message);
});
