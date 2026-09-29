const fs = require('fs');
const { execSync } = require('child_process');
const { ethers } = require('ethers');

async function inspectKnown() {
  const provider = new ethers.JsonRpcProvider('https://testnet-rpc.monad.xyz');
  const escrowAddress = '0x925ea880cA53DE0352b84B24d0C0dee5B258015A';
  const escrowArtifact = JSON.parse(fs.readFileSync('contracts/out/TrustMeshEscrow.sol/TrustMeshEscrow.json', 'utf-8'));
  const escrow = new ethers.Contract(escrowAddress, escrowArtifact.abi, provider);

  const STATE_NAMES = [
    'DRAFT (0)', 'PROPOSED (1)', 'NEGOTIATING (2)', 'AGREED (3)', 'FUNDED (4)',
    'IN_PROGRESS (5)', 'EVIDENCE_SUBMITTED (6)', 'VERIFICATION (7)', 'DISPUTED (8)',
    'JUDGING (9)', 'RESOLVED (10)', 'SETTLED (11)', 'REFUNDED (12)', 'CANCELLED (13)'
  ];

  const raw = execSync('git grep -ohE "0x[a-fA-F0-9]{64}"', { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
  const txIds = Array.from(new Set(raw.split('\n').map(s => s.trim()).filter(s => s.length === 66)));
  console.log('Unique bytes32 hashes in repo:', txIds.length);

  let activeLiabilitySum = 0n;

  for (const h of txIds) {
    try {
      const rec = await escrow.getTransaction(h);
      if (Number(rec.createdAt) > 0) {
        console.log('\n--- Found Onchain Transaction ---');
        console.log('Tx ID:', h);
        console.log('State:', STATE_NAMES[Number(rec.state)] || Number(rec.state));
        console.log('Amount:', ethers.formatEther(rec.totalAmount), 'MON');
        console.log('Buyer:', rec.buyer);
        console.log('Seller:', rec.seller);
        console.log('Verifier:', rec.verifier);
        console.log('FundedAt:', Number(rec.fundedAt) > 0 ? new Date(Number(rec.fundedAt)*1000).toISOString() : 'Not Funded');
        console.log('SettledAt:', Number(rec.settledAt) > 0 ? new Date(Number(rec.settledAt)*1000).toISOString() : 'Not Settled');
        
        // If state is FUNDED (4) through RESOLVED (10), does it count towards liabilities?
        // Let's check contract logic for totalEscrowLiabilities
      }
    } catch (e) {}
  }

  const liabilities = await escrow.totalEscrowLiabilities();
  console.log('\nContract totalEscrowLiabilities():', ethers.formatEther(liabilities), 'MON');
  const bal = await provider.getBalance(escrowAddress);
  console.log('Contract Balance:', ethers.formatEther(bal), 'MON');
}

inspectKnown().catch(console.error);
