const fs = require('fs');
const path = require('path');

const SUSPICIOUS_PATTERNS = [
  { name: 'OpenAI API Key', regex: /sk-[a-zA-Z0-9]{20,}/ },
  { name: 'Google API Key', regex: /AIza[0-9A-Za-z-_]{35}/ },
  { name: 'GitHub Personal Token', regex: /ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{50,}/ },
  { name: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'Private Key Variable', regex: /(?:private[_-]?key|secret[_-]?key)\s*[:=]\s*["']([0-9a-zA-Z]{32,66})["']/i },
  { name: 'Hardcoded Seed/Mnemonic Phrase', regex: /(?:mnemonic|seed[_-]?phrase)\s*[:=]\s*["']([a-z]+(\s+[a-z]+){11,23})["']/i },
  { name: 'Private Key Hex (unlabeled)', regex: /["']0x[0-9a-fA-F]{64}["']/ }
];

const IGNORE_DIRS = new Set([
  '.git', 'node_modules', '.next', 'dist', 'build', 'out', 'cache', '.turbo'
]);

// Known public hashes that are safe (contract addresses, transaction IDs, terms hashes, bytecode hashes, selector hashes)
const SAFE_HASHES = new Set([
  '0x0000000000000000000000000000000000000000000000000000000000000000',
  '0x961c70865bf6097eb16d1b3a19d90f950b2cdd789eda5554c93baba1de0954e1',
  '0xebb931936199ae988129d1eed8501a6ad3311035f0d72dd0e52e0c92454a125f',
  '0x08a30b2c4935050f1ffbda42a5a6565ab54fc1b090bb47c036afd47aaad2edff',
  '0xb407b4105f5f9584e3837ed5fdc6767c8b48b5a771a54d9d2b5f83d2f0ff210f',
  '0x89b9c3150963c84e7e9c3e1c8c921289f9d0595ae6e4db6516f296f7532309e6',
  '0x8e1165018ce2839355ccc0ffdbd4d1a362b538619e7d9c620fad910bf608b51f',
  '0x698ef9bed9a8007db66a6047187783dd97d026055b0f2e30cfe75826ad7b923e',
  '0x0c1a3b6b468da55a01f11bf77ae0b016a6053cef4d3673aabf56c5995131a121',
  '0x4d4ff904821b9d3fe145b00a0e27f2096e567155a6d20c50e7b6913095f29bb0',
  '0x691f7a80d65fe1deece2f45e8b6600ee4b2b0ffc14f3fe733d995566e2d83b52',
  '0xeddd26b03699fa0dd8aabd5a8ff260abca029ece60c13dae916fe4060f33e2cd',
  '0x4ac4c4b6cdf18b753f5e5f536f83a93545c5c185129ea58418ca9e38cdf11f8a',
  '0xb085f04396db481be7d06034a6b86c345d522b5ce79bf968fb24b05b3dfb470b',
  '0x2b57d6b0ef1ba16a60c4f801d90d27d23e598fd6b1381e0175077201dc6afcc4',
  '0x22fac00f8a77ff545501fc8b7e560c770b647717249050bb7eb500965eb2763e',
  '0xbbd0176291d62b32c3e096d0314c0fab6bcfa9131c1b26a825b3ce994e645f5e',
  '0x6b390e7ab400b8539b6a22077bf7751c62e9395b2f900e1f4b2aee084151afc2',
  '0x91ff62584f4386250ccb09f28808453bb373273d9fa5f56cf04378c2a78084ba',
  '0xb8e391dd94e2e0ee37e6daef32095f33f6a27ec2639162aa321cfca6dff6fe26'
]);

function getAllFiles(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllFiles(fullPath, fileList);
    } else {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const allFiles = getAllFiles('.');
console.log(`Scanning ${allFiles.length} files for secrets & credentials...\n`);

const findings = [];

for (const file of allFiles) {
  // Skip binary files
  if (file.endsWith('.mp4') || file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.ico')) continue;
  
  let content = '';
  try {
    content = fs.readFileSync(file, 'utf-8');
  } catch {
    continue;
  }

  for (const pattern of SUSPICIOUS_PATTERNS) {
    const match = content.match(pattern.regex);
    if (match) {
      const matchVal = match[1] || match[0];
      // Filter out zero placeholders and known public hashes
      const cleanVal = matchVal.replace(/["']/g, '');
      if (SAFE_HASHES.has(cleanVal.toLowerCase()) || cleanVal.includes('0000000000000000000000000000000000000000')) {
        continue;
      }
      findings.push({
        file,
        pattern: pattern.name,
        match: cleanVal.slice(0, 16) + '...' + cleanVal.slice(-4),
      });
    }
  }
}

if (findings.length === 0) {
  console.log('✓ ZERO SECRETS FOUND: No private keys, seed phrases, or credentials detected in scanned files.');
} else {
  console.log(`Found ${findings.length} potential items to review:`);
  findings.forEach(f => console.log(`  [${f.pattern}] in ${f.file}: ${f.match}`));
}
