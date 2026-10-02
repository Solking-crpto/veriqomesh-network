import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const outDir = 'scripts/video-production/frames';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const markPath = path.resolve('apps/web/public/brand/veriqomesh-mark.png');
const logoPath = path.resolve('apps/web/public/brand/veriqomesh-logo.png');

// Helper to escape XML
function esc(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Global top status bar
function renderTopBar(walletAddress = null, role = null) {
  return `
    <!-- Top Global Header -->
    <rect x="0" y="0" width="1920" height="70" fill="#07080d" fill-opacity="0.96"/>
    <line x1="0" y1="70" x2="1920" y2="70" stroke="#1f2937" stroke-width="1.5"/>
    
    <!-- Status Pill -->
    <rect x="50" y="18" width="220" height="34" rx="17" fill="#140a28" stroke="#7c3aed" stroke-width="1.2"/>
    <circle cx="72" cy="35" r="5" fill="#a855f7"/>
    <text x="88" y="41" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" fill="#c084fc">MONAD TESTNET READY</text>
    
    <!-- Network & Contracts Info -->
    <text x="290" y="41" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" fill="#9ca3af">
      Monad Metropolis <tspan fill="#6b7280">(Chain ID: 10143)</tspan> • Escrow: <tspan fill="#d1d5db" font-family="monospace">0x925ea8...015A</tspan>
    </text>
    
    <!-- Right side wallet / branding -->
    ${walletAddress ? `
      <rect x="1560" y="16" width="310" height="38" rx="19" fill="#111827" stroke="#374151" stroke-width="1.2"/>
      <circle cx="1585" cy="35" r="6" fill="${role === 'RECEIVER' ? '#60a5fa' : '#34d399'}"/>
      <text x="1605" y="40" font-family="'Segoe UI', Roboto, monospace" font-size="13" font-weight="700" fill="#ffffff">
        ${walletAddress}
      </text>
      <rect x="1775" y="21" width="85" height="26" rx="13" fill="${role === 'RECEIVER' ? '#1e3a8a' : '#1e103a'}"/>
      <text x="1817" y="38" font-family="'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="800" fill="${role === 'RECEIVER' ? '#93c5fd' : '#c084fc'}" text-anchor="middle">
        ${role || 'CONNECTED'}
      </text>
    ` : `
      <rect x="1700" y="16" width="170" height="38" rx="19" fill="#7c3aed"/>
      <text x="1785" y="40" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#ffffff" text-anchor="middle">Connect Wallet</text>
    `}
  `;
}

// Step Header Banner
function renderStepBanner(stepLabel, title, actionBadge) {
  return `
    <g transform="translate(160, 85)">
      <rect x="0" y="0" width="1600" height="42" rx="10" fill="#0d111d" stroke="#1f2937" stroke-width="1.2"/>
      ${stepLabel ? `
        <rect x="0" y="0" width="180" height="42" rx="10" fill="#2e1065"/>
        <text x="90" y="26" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800" fill="#c084fc" text-anchor="middle">${esc(stepLabel)}</text>
      ` : ''}
      <text x="${stepLabel ? 205 : 30}" y="26" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#ffffff">${esc(title)}</text>
      ${actionBadge ? `
        <text x="1570" y="26" font-family="'Segoe UI', Roboto, monospace" font-size="12" font-weight="700" fill="#38bdf8" text-anchor="end">${esc(actionBadge)}</text>
      ` : ''}
    </g>
  `;
}

// Subtitle Box at Bottom
function renderSubtitleBar(text) {
  return `
    <rect x="160" y="960" width="1600" height="74" rx="16" fill="#0b0d18" fill-opacity="0.94" stroke="#374151" stroke-width="1.5"/>
    <text x="960" y="1006" font-family="'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="600" fill="#f3f4f6" text-anchor="middle">
      "${esc(text)}"
    </text>
  `;
}

// Cursor Pointer Helper
function renderCursor(x, y, label = '') {
  return `
    <g transform="translate(${x}, ${y})">
      <polygon points="0,0 0,24 6,18 12,28 16,26 10,16 19,16" fill="#ffffff" stroke="#000000" stroke-width="1.5"/>
      ${label ? `
        <rect x="24" y="10" width="${label.length * 8 + 20}" height="26" rx="6" fill="#090a14" stroke="#7c3aed" stroke-width="1.2"/>
        <text x="34" y="27" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#c084fc">${label}</text>
      ` : ''}
    </g>
  `;
}

// 15 SHOTS DEFINITION
const shotDefinitions = [
  // ==========================================
  // SHOT 01: Hook - Live Product Homepage
  // ==========================================
  {
    id: 'shot01',
    subtitle: "What happens when AI helps negotiate a deal, but cannot control the money? Let's actually run the deal.",
    svgContent: `
      ${renderTopBar()}
      ${renderStepBanner('START', 'VERIQOMESH NETWORK • MONAD METROPOLIS TESTNET', 'LIVE WORKFLOW WALKTHROUGH')}

      <!-- Hero Glow Background -->
      <radialGradient id="heroGlow" cx="50%" cy="35%" r="50%">
        <stop offset="0%" stop-color="#581c87" stop-opacity="0.35"/>
        <stop offset="60%" stop-color="#1e1b4b" stop-opacity="0.1"/>
        <stop offset="100%" stop-color="#07080d" stop-opacity="0"/>
      </radialGradient>
      <rect x="0" y="130" width="1920" height="830" fill="url(#heroGlow)"/>

      <!-- Center Title -->
      <text x="960" y="320" font-family="'Segoe UI', Roboto, sans-serif" font-size="64" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2">
        VERIQOMESH <tspan fill="#c084fc">NETWORK</tspan>
      </text>

      <text x="960" y="380" font-family="'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="700" fill="#e5e7eb" text-anchor="middle">
        Programmable Trust for Human &amp; AI Commerce
      </text>

      <text x="960" y="425" font-family="'Segoe UI', Roboto, monospace" font-size="18" fill="#9ca3af" text-anchor="middle">
        AI assists the deal • Humans authorize • Blockchain enforces the money
      </text>

      <!-- 4 Pillars Ribbon -->
      <rect x="410" y="470" width="1100" height="52" rx="14" fill="#0d111e" stroke="#1f2937" stroke-width="1.5"/>
      <text x="480" y="502" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="800" fill="#c084fc">1. AI ASSISTS</text>
      <text x="700" y="502" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="800" fill="#60a5fa">2. HUMANS AUTHORIZE</text>
      <text x="990" y="502" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="800" fill="#fbbf24">3. VERIFIERS VERIFY</text>
      <text x="1270" y="502" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="800" fill="#34d399">4. BLOCKCHAIN ENFORCES</text>

      <!-- Launch Action Cards -->
      <rect x="460" y="560" width="480" height="280" rx="20" fill="#0f1122" stroke="#7c3aed" stroke-width="2.5"/>
      <rect x="490" y="585" width="170" height="26" rx="6" fill="#3b0764"/>
      <text x="500" y="603" font-family="'Segoe UI', Roboto, monospace" font-size="11" font-weight="800" fill="#d8b4fe">BUYER / PRINCIPAL</text>
      <text x="490" y="650" font-family="'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="800" fill="#ffffff">Transaction Initiator</text>
      <text x="490" y="685" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" fill="#9ca3af">Structure natural language needs, fund non-custodial escrow,</text>
      <text x="490" y="708" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" fill="#9ca3af">and require cryptographic evidence verification on Monad.</text>
      <rect x="490" y="750" width="420" height="54" rx="12" fill="#7c3aed"/>
      <text x="700" y="784" font-family="'Segoe UI', Roboto, sans-serif" font-size="17" font-weight="800" fill="#ffffff" text-anchor="middle">LAUNCH APPLICATION →</text>

      <!-- Receiver Card -->
      <rect x="980" y="560" width="480" height="280" rx="20" fill="#0c1322" stroke="#2563eb" stroke-width="2"/>
      <rect x="1010" y="585" width="190" height="26" rx="6" fill="#1e3a8a"/>
      <text x="1020" y="603" font-family="'Segoe UI', Roboto, monospace" font-size="11" font-weight="800" fill="#93c5fd">SELLER / FULFILLMENT</text>
      <text x="1010" y="650" font-family="'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="800" fill="#ffffff">Transaction Receiver</text>
      <text x="1010" y="685" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" fill="#9ca3af">Review inbound requests, ratify terms via wallet,</text>
      <text x="1010" y="708" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" fill="#9ca3af">anchor cryptographic proof, and claim verified payout.</text>
      <rect x="1010" y="750" width="420" height="54" rx="12" fill="#2563eb"/>
      <text x="1220" y="784" font-family="'Segoe UI', Roboto, sans-serif" font-size="17" font-weight="800" fill="#ffffff" text-anchor="middle">ENTER AS RECEIVER →</text>

      ${renderCursor(780, 770, 'CLICK TO RUN DEAL')}
    `,
    hasLogoTop: true
  },

  // ==========================================
  // SHOT 02: Connect Wallet / Identity
  // ==========================================
  {
    id: 'shot02',
    subtitle: "First, connect your Monad wallet. That wallet is your identity inside VeriqoMesh, so the application knows which side of the transaction you're authorized to act for.",
    svgContent: `
      ${renderTopBar('0xf39F...2266', 'BUYER')}
      ${renderStepBanner('STEP 1', 'CONNECT WALLET & IDENTITY WORKSPACE', 'ROLE ISOLATION ACTIVE')}

      <!-- Main Container -->
      <rect x="260" y="160" width="1400" height="760" rx="20" fill="#0b0e1b" stroke="#7c3aed" stroke-width="2"/>

      <!-- Modal Dialog: Connect Wallet & Identity Resolution -->
      <rect x="460" y="210" width="1000" height="660" rx="16" fill="#0f1325" stroke="#a855f7" stroke-width="2"/>
      
      <!-- Modal Header -->
      <text x="510" y="270" font-family="'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="900" fill="#ffffff">
        Wallet Connected: Cryptographic Identity
      </text>
      <text x="510" y="305" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" fill="#9ca3af">
        Your connected Monad wallet establishes your authenticated persona and mutation rights.
      </text>

      <!-- Active Identity Card -->
      <rect x="510" y="340" width="900" height="150" rx="14" fill="#141a32" stroke="#3b82f6" stroke-width="1.5"/>
      <circle cx="560" cy="415" r="28" fill="#1e3a8a"/>
      <text x="560" y="423" font-family="'Segoe UI', Roboto, sans-serif" font-size="22" fill="#60a5fa" text-anchor="middle">👤</text>
      
      <text x="610" y="390" font-family="'Segoe UI', Roboto, monospace" font-size="12" font-weight="800" fill="#93c5fd">AUTHENTICATED PRINCIPAL</text>
      <text x="610" y="420" font-family="'Segoe UI', Roboto, monospace" font-size="20" font-weight="800" fill="#ffffff">
        0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
      </text>
      <text x="610" y="450" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" fill="#34d399">
        ✓ Monad Metropolis Testnet (Chain ID 10143) • Balance: 12.450 MON
      </text>

      <!-- Role-Aware Workspaces Grid -->
      <g transform="translate(510, 520)">
        <!-- Buyer Persona -->
        <rect x="0" y="0" width="435" height="180" rx="12" fill="#1e103a" stroke="#a855f7" stroke-width="2"/>
        <rect x="25" y="25" width="130" height="24" rx="6" fill="#581c87"/>
        <text x="90" y="41" font-family="'Segoe UI', Roboto, monospace" font-size="11" font-weight="800" fill="#e9d5ff" text-anchor="middle">ACTIVE ROLE</text>
        <text x="25" y="85" font-family="'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="800" fill="#ffffff">Deal Initiator</text>
        <text x="25" y="115" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" fill="#d8b4fe">Authorized to create agreements, fund escrow vault, and set verification policy.</text>
        <text x="25" y="150" font-family="'Segoe UI', Roboto, monospace" font-size="12" fill="#c084fc">Workspace: /initiator/intent ✓</text>

        <!-- Receiver Persona -->
        <rect x="465" y="0" width="435" height="180" rx="12" fill="#0d192c" stroke="#1f2937" stroke-width="1.2"/>
        <rect x="490" y="25" width="130" height="24" rx="6" fill="#1e293b"/>
        <text x="555" y="41" font-family="'Segoe UI', Roboto, monospace" font-size="11" font-weight="700" fill="#9ca3af" text-anchor="middle">ISOLATED ROLE</text>
        <text x="490" y="85" font-family="'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="800" fill="#9ca3af">Deal Receiver</text>
        <text x="490" y="115" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" fill="#6b7280">Receives deal requests, reviews terms, and signs via EIP-191 wallet signature.</text>
        <text x="490" y="150" font-family="'Segoe UI', Roboto, monospace" font-size="12" fill="#6b7280">Requires Counterparty Wallet Switch</text>
      </g>

      <!-- Bottom Isolation Guarantee -->
      <rect x="510" y="730" width="900" height="50" rx="10" fill="#090d18" stroke="#1e293b" stroke-width="1.2"/>
      <text x="960" y="761" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#60a5fa" text-anchor="middle">
        🔒 Strict Persona Isolation: Disconnected or unauthorized wallets cannot view or mutate private deals.
      </text>

      ${renderCursor(720, 610, 'INITIATOR WORKSPACE ACTIVE')}
    `
  },

  // ==========================================
  // SHOT 03: Initiator Creates Deal (Natural Language Intent)
  // ==========================================
  {
    id: 'shot03',
    subtitle: "Now I'm the initiator. I start with a plain-English commercial need. What am I buying? How much does it cost? Who receives the payment? Who verifies the result? And what evidence proves the work is complete? VeriqoMesh turns that intent into explicit agreement parameters.",
    svgContent: `
      ${renderTopBar('0xf39F...2266', 'BUYER')}
      ${renderStepBanner('STEP 2', 'INITIATOR CREATES DEAL • NATURAL LANGUAGE INTENT COMPOSER', '/initiator/intent')}

      <!-- Main Form Container -->
      <rect x="260" y="150" width="1400" height="780" rx="20" fill="#0c0e18" stroke="#7c3aed" stroke-width="2"/>

      <text x="310" y="210" font-family="'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="900" fill="#ffffff">
        Commercial Intent Composer
      </text>
      <text x="310" y="240" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" fill="#9ca3af">
        State your commercial intent in natural language. VeriqoMesh decomposes it into explicit contract parameters.
      </text>

      <!-- Deal Title Field -->
      <text x="310" y="285" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800" fill="#c084fc">1. DEAL TITLE</text>
      <rect x="310" y="298" width="1300" height="46" rx="8" fill="#131626" stroke="#374151" stroke-width="1.5"/>
      <text x="330" y="328" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" fill="#ffffff">
        Commercial Solar Equipment Supply &amp; Logistics
      </text>

      <!-- Natural Language Prompt Box -->
      <text x="310" y="375" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800" fill="#c084fc">2. PLAIN-ENGLISH COMMERCIAL NEED</text>
      <rect x="310" y="388" width="1300" height="120" rx="10" fill="#131626" stroke="#7c3aed" stroke-width="2"/>
      <text x="335" y="425" font-family="'Segoe UI', Roboto, sans-serif" font-size="17" fill="#f3f4f6">
        "Purchase and delivery of 100 commercial solar panels to Dallas Depot. Escrow 0.001 MON on Monad."
      </text>
      <text x="335" y="460" font-family="'Segoe UI', Roboto, sans-serif" font-size="17" fill="#f3f4f6">
        "Receiver wallet 0x0e73...6Ee8. Independent depot inspection sign-off required before payout release."
      </text>

      <!-- 4 Explicit Intent Inquiries Decomposed -->
      <g transform="translate(310, 530)">
        <rect x="0" y="0" width="305" height="140" rx="10" fill="#0f1628" stroke="#1e293b" stroke-width="1.2"/>
        <text x="20" y="32" font-family="'Segoe UI', Roboto, monospace" font-size="11" font-weight="800" fill="#60a5fa">DELIVERABLE &amp; COST</text>
        <text x="20" y="65" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="800" fill="#ffffff">100 Solar Panels</text>
        <text x="20" y="95" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" fill="#34d399" font-weight="700">Cost: 0.001 MON</text>
        <text x="20" y="120" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" fill="#9ca3af">Monad Metropolis Escrow</text>

        <rect x="330" y="0" width="305" height="140" rx="10" fill="#0f1628" stroke="#1e293b" stroke-width="1.2"/>
        <text x="350" y="32" font-family="'Segoe UI', Roboto, monospace" font-size="11" font-weight="800" fill="#60a5fa">RECEIVER (SELLER)</text>
        <text x="350" y="65" font-family="'Segoe UI', Roboto, monospace" font-size="13" font-weight="700" fill="#ffffff">0x0e73...6Ee8</text>
        <text x="350" y="95" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" fill="#93c5fd">Dallas Solar Supply Co.</text>
        <text x="350" y="120" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" fill="#9ca3af">EIP-191 Ratification Req</text>

        <rect x="660" y="0" width="305" height="140" rx="10" fill="#0f1628" stroke="#1e293b" stroke-width="1.2"/>
        <text x="680" y="32" font-family="'Segoe UI', Roboto, monospace" font-size="11" font-weight="800" fill="#22d3ee">INDEPENDENT VERIFIER</text>
        <text x="680" y="65" font-family="'Segoe UI', Roboto, monospace" font-size="13" font-weight="700" fill="#ffffff">0xb064...2c48</text>
        <text x="680" y="95" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" fill="#67e8f9">Depot Compliance Auditor</text>
        <text x="680" y="120" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" fill="#9ca3af">Submits PASS/FAIL onchain</text>

        <rect x="990" y="0" width="310" height="140" rx="10" fill="#0f1628" stroke="#1e293b" stroke-width="1.2"/>
        <text x="1010" y="32" font-family="'Segoe UI', Roboto, monospace" font-size="11" font-weight="800" fill="#fbbf24">EVIDENCE REQUIRED</text>
        <text x="1010" y="65" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" fill="#ffffff">Bill of Lading + QA Log</text>
        <text x="1010" y="95" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" fill="#fde68a">Keccak-256 IPFS Anchor</text>
        <text x="1010" y="120" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" fill="#9ca3af">Raw files stay offchain</text>
      </g>

      <!-- Action Button -->
      <g transform="translate(310, 695)">
        <rect x="0" y="0" width="400" height="54" rx="12" fill="#7c3aed"/>
        <text x="200" y="34" font-family="'Segoe UI', Roboto, sans-serif" font-size="17" font-weight="800" fill="#ffffff" text-anchor="middle">
          GENERATE STRUCTURED AGREEMENT ✨
        </text>

        <rect x="430" y="0" width="870" height="54" rx="12" fill="#140f28" stroke="#7e22ce" stroke-width="1.2"/>
        <text x="455" y="33" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" fill="#d8b4fe">
          ⚡ AI assists deal composition • Monad wallet maintains 100% financial execution authority.
        </text>
      </g>

      ${renderCursor(480, 725, 'CLICK TO COMPOSE')}
    `
  },

  // ==========================================
  // SHOT 04: Structured Agreement Parameters
  // ==========================================
  {
    id: 'shot04',
    subtitle: "Now the deal is explicit. Deliverable. Amount. Deadline. Receiver. Verifier. Evidence requirements. No hidden assumptions.",
    svgContent: `
      ${renderTopBar('0xf39F...2266', 'BUYER')}
      ${renderStepBanner('STEP 3', 'EXPLICIT AGREEMENT PARAMETERS', '6 RIGOROUS CONDITIONS')}

      <!-- Main Container -->
      <rect x="260" y="150" width="1400" height="780" rx="20" fill="#0b0e1b" stroke="#7c3aed" stroke-width="2"/>

      <text x="310" y="210" font-family="'Segoe UI', Roboto, sans-serif" font-size="30" font-weight="900" fill="#ffffff">
        Structured Commercial Agreement
      </text>
      <text x="310" y="240" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" fill="#a855f7">
        Zero hidden assumptions. Every condition is strictly specified and ready for deterministic execution.
      </text>

      <!-- 6 Parameter Cards Grid (2 rows of 3) -->
      <g transform="translate(310, 265)">
        <!-- Card 1: Deliverable -->
        <rect x="0" y="0" width="415" height="190" rx="14" fill="#0f1424" stroke="#3b82f6" stroke-width="1.8"/>
        <text x="25" y="38" font-family="'Segoe UI', Roboto, monospace" font-size="12" font-weight="800" fill="#60a5fa">01 / DELIVERABLE</text>
        <text x="25" y="78" font-family="'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="800" fill="#ffffff">100x Commercial Solar Panels</text>
        <text x="25" y="115" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" fill="#9ca3af">Tier-1 high efficiency photovoltaic units</text>
        <text x="25" y="140" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" fill="#9ca3af">Delivered to Dallas Logistics Depot</text>
        <rect x="25" y="152" width="120" height="22" rx="6" fill="#1e3a8a"/>
        <text x="85" y="167" font-family="'Segoe UI', Roboto, monospace" font-size="11" font-weight="700" fill="#bfdbfe" text-anchor="middle">SPECIFIED ✓</text>

        <!-- Card 2: Amount -->
        <rect x="445" y="0" width="415" height="190" rx="14" fill="#0b1b16" stroke="#10b981" stroke-width="1.8"/>
        <text x="470" y="38" font-family="'Segoe UI', Roboto, monospace" font-size="12" font-weight="800" fill="#34d399">02 / ESCROW AMOUNT</text>
        <text x="470" y="80" font-family="'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="900" fill="#34d399">0.001 MON</text>
        <text x="470" y="115" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" fill="#9ca3af">Native Monad Metropolis Testnet</text>
        <text x="470" y="140" font-family="'Segoe UI', Roboto, monospace" font-size="13" fill="#6ee7b7">Solvency: 100% Vault Solvent</text>
        <rect x="470" y="152" width="120" height="22" rx="6" fill="#064e3b"/>
        <text x="530" y="167" font-family="'Segoe UI', Roboto, monospace" font-size="11" font-weight="700" fill="#a7f3d0" text-anchor="middle">FUNDED ✓</text>

        <!-- Card 3: Deadline -->
        <rect x="885" y="0" width="415" height="190" rx="14" fill="#1c160c" stroke="#f59e0b" stroke-width="1.8"/>
        <text x="910" y="38" font-family="'Segoe UI', Roboto, monospace" font-size="12" font-weight="800" fill="#fbbf24">03 / DEADLINE &amp; TIMELOCK</text>
        <text x="910" y="78" font-family="'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="800" fill="#ffffff">14-Day Delivery Window</text>
        <text x="910" y="115" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" fill="#9ca3af">Automatic timelock expiration guard</text>
        <text x="910" y="140" font-family="'Segoe UI', Roboto, monospace" font-size="13" fill="#fde68a">Block Target: +1,209,600 sec</text>
        <rect x="910" y="152" width="120" height="22" rx="6" fill="#78350f"/>
        <text x="970" y="167" font-family="'Segoe UI', Roboto, monospace" font-size="11" font-weight="700" fill="#fef3c7" text-anchor="middle">TIMELOCKED ✓</text>

        <!-- Card 4: Receiver -->
        <rect x="0" y="215" width="415" height="190" rx="14" fill="#140f28" stroke="#a855f7" stroke-width="1.8"/>
        <text x="25" y="253" font-family="'Segoe UI', Roboto, monospace" font-size="12" font-weight="800" fill="#c084fc">04 / RECEIVER (SELLER)</text>
        <text x="25" y="293" font-family="'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="800" fill="#ffffff">Dallas Solar Supply Co.</text>
        <text x="25" y="325" font-family="'Segoe UI', Roboto, monospace" font-size="13" fill="#e9d5ff">0x0e73dBFf9047423b...6Ee8</text>
        <text x="25" y="352" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" fill="#9ca3af">Designated sole payout beneficiary</text>
        <rect x="25" y="367" width="130" height="22" rx="6" fill="#3b0764"/>
        <text x="90" y="382" font-family="'Segoe UI', Roboto, monospace" font-size="11" font-weight="700" fill="#d8b4fe" text-anchor="middle">AUTHORIZED ✓</text>

        <!-- Card 5: Verifier -->
        <rect x="445" y="215" width="415" height="190" rx="14" fill="#0c1720" stroke="#06b6d4" stroke-width="1.8"/>
        <text x="470" y="253" font-family="'Segoe UI', Roboto, monospace" font-size="12" font-weight="800" fill="#22d3ee">05 / INDEPENDENT VERIFIER</text>
        <text x="470" y="293" font-family="'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="800" fill="#ffffff">Depot Compliance Auditor</text>
        <text x="470" y="325" font-family="'Segoe UI', Roboto, monospace" font-size="13" fill="#67e8f9">0xb064d6...2c48</text>
        <text x="470" y="352" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" fill="#9ca3af">Audits offchain evidence proof</text>
        <rect x="470" y="367" width="130" height="22" rx="6" fill="#164e63"/>
        <text x="535" y="382" font-family="'Segoe UI', Roboto, monospace" font-size="11" font-weight="700" fill="#cffafe" text-anchor="middle">ATTESTING ✓</text>

        <!-- Card 6: Evidence -->
        <rect x="885" y="215" width="415" height="190" rx="14" fill="#1a1118" stroke="#ec4899" stroke-width="1.8"/>
        <text x="910" y="253" font-family="'Segoe UI', Roboto, monospace" font-size="12" font-weight="800" fill="#f472b6">06 / EVIDENCE REQUIREMENTS</text>
        <text x="910" y="293" font-family="'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="800" fill="#ffffff">Delivery BOL + QA Audit</text>
        <text x="910" y="325" font-family="'Segoe UI', Roboto, monospace" font-size="13" fill="#fbcfe8">Keccak-256 Content Digest</text>
        <text x="910" y="352" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" fill="#9ca3af">Raw files private in IPFS storage</text>
        <rect x="910" y="367" width="130" height="22" rx="6" fill="#831843"/>
        <text x="975" y="382" font-family="'Segoe UI', Roboto, monospace" font-size="11" font-weight="700" fill="#fce7f3" text-anchor="middle">ANCHORED ✓</text>
      </g>

      <!-- Bottom Assurance Banner -->
      <rect x="310" y="700" width="1300" height="60" rx="12" fill="#0f111e" stroke="#1f2937" stroke-width="1.2"/>
      <text x="960" y="737" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" fill="#e5e7eb" text-anchor="middle">
        All 6 parameters are deterministic, binding onchain, and non-negotiable once ratified.
      </text>
    `
  },

  // ==========================================
  // SHOT 05: Deterministic Canonical Commitment
  // ==========================================
  {
    id: 'shot05',
    subtitle: "Before money moves, those terms are deterministically represented and cryptographically committed. Same agreement. Same terms.",
    svgContent: `
      ${renderTopBar('0xf39F...2266', 'BUYER')}
      ${renderStepBanner('STEP 4', 'DETERMINISTIC CANONICAL COMMITMENT', 'KECCAK-256 AGREEMENT HASH')}

      <!-- Main Container -->
      <rect x="260" y="160" width="1400" height="760" rx="20" fill="#0b0e1b" stroke="#7c3aed" stroke-width="2.5"/>

      <text x="310" y="225" font-family="'Segoe UI', Roboto, sans-serif" font-size="32" font-weight="900" fill="#ffffff">
        Deterministic Agreement Commitment
      </text>
      <text x="310" y="260" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" fill="#c084fc">
        serializeCanonicalAgreement(terms) → keccak256 hash. Prevents alteration or hidden clauses.
      </text>

      <!-- The Big Hash Container -->
      <g transform="translate(310, 290)">
        <text x="0" y="25" font-family="'Segoe UI', Roboto, monospace" font-size="13" font-weight="800" fill="#9ca3af">
          CANONICAL AGREEMENT COMMITMENT HASH (KECCAK-256):
        </text>
        <rect x="0" y="40" width="1300" height="90" rx="14" fill="#14102c" stroke="#a855f7" stroke-width="2"/>
        <text x="650" y="95" font-family="'Segoe UI', Roboto, monospace" font-size="28" font-weight="900" fill="#38bdf8" text-anchor="middle" letter-spacing="1">
          0xebb931936199ae988129d1eed8501a6ad3311035f0d72dd0e52e0c92454a125f
        </text>
      </g>

      <!-- Two Side-by-Side Verification Panels -->
      <g transform="translate(310, 460)">
        <!-- Panel 1: Canonical Serialization -->
        <rect x="0" y="0" width="630" height="230" rx="14" fill="#0d1122" stroke="#1f2937" stroke-width="1.5"/>
        <text x="25" y="35" font-family="'Segoe UI', Roboto, monospace" font-size="12" font-weight="800" fill="#60a5fa">DETERMINISTIC SERIALIZATION</text>
        <text x="25" y="70" font-family="'Segoe UI', Roboto, monospace" font-size="13" fill="#d1d5db">{"deliverable":"100 Commercial Solar Panels",</text>
        <text x="25" y="98" font-family="'Segoe UI', Roboto, monospace" font-size="13" fill="#d1d5db"> "amount":"1000000000000000", // 0.001 MON</text>
        <text x="25" y="126" font-family="'Segoe UI', Roboto, monospace" font-size="13" fill="#d1d5db"> "receiver":"0x0e73dBFf9047423b...6Ee8",</text>
        <text x="25" y="154" font-family="'Segoe UI', Roboto, monospace" font-size="13" fill="#d1d5db"> "verifier":"0xb064d69428B9838...2c48",</text>
        <text x="25" y="182" font-family="'Segoe UI', Roboto, monospace" font-size="13" fill="#d1d5db"> "deadline":"1743552000"}</text>
        <text x="25" y="210" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" fill="#34d399">✓ Guaranteed byte-for-byte reproducibility</text>

        <!-- Panel 2: Cryptographic Commitment -->
        <rect x="670" y="0" width="630" height="230" rx="14" fill="#0d1122" stroke="#1f2937" stroke-width="1.5"/>
        <text x="695" y="35" font-family="'Segoe UI', Roboto, monospace" font-size="12" font-weight="800" fill="#a855f7">MUTATION IMMUNITY</text>
        <text x="695" y="75" font-family="'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="700" fill="#ffffff">Cryptographic Integrity Guaranteed</text>
        <text x="695" y="110" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" fill="#9ca3af">• Changing a single character alters the entire hash.</text>
        <text x="695" y="140" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" fill="#9ca3af">• Both parties review the exact same commitment.</text>
        <text x="695" y="170" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" fill="#9ca3af">• Locked onchain in TrustMeshEscrow upon creation.</text>
        <rect x="695" y="190" width="300" height="26" rx="6" fill="#1e103a"/>
        <text x="845" y="208" font-family="'Segoe UI', Roboto, monospace" font-size="11" font-weight="800" fill="#d8b4fe" text-anchor="middle">SAME AGREEMENT • SAME TERMS</text>
      </g>

      <!-- Bottom Status Pill -->
      <rect x="520" y="730" width="880" height="50" rx="25" fill="#064e3b" stroke="#10b981" stroke-width="1.5"/>
      <text x="960" y="762" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" fill="#a7f3d0" text-anchor="middle">
        ✓ Committed Before Escrow Moves • Canonical Hash Stored in Smart Contract
      </text>
    `
  },

  // ==========================================
  // SHOT 06: Receiver Workflow (Inbound Requests)
  // ==========================================
  {
    id: 'shot06',
    subtitle: "Now switch to the receiver. The receiver gets the actual agreement, not a vague notification. They can review exactly what was proposed: the amount, the deliverable, the deadline, the verifier, and the evidence requirements.",
    svgContent: `
      ${renderTopBar('0x0e73...6Ee8', 'RECEIVER')}
      ${renderStepBanner('STEP 5', 'RECEIVER WORKFLOW • INBOUND DEAL REQUESTS', '/requests')}

      <!-- Main Container -->
      <rect x="260" y="150" width="1400" height="780" rx="20" fill="#0a101d" stroke="#2563eb" stroke-width="2"/>

      <!-- Header -->
      <rect x="310" y="195" width="1300" height="56" rx="12" fill="#111c38"/>
      <circle cx="340" cy="223" r="6" fill="#3b82f6"/>
      <text x="360" y="229" font-family="'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="800" fill="#ffffff">
        INBOUND COMMERCIAL AGREEMENT FOR REVIEW &amp; RATIFICATION
      </text>
      <text x="1570" y="229" font-family="'Segoe UI', Roboto, monospace" font-size="14" font-weight="700" fill="#60a5fa" text-anchor="end">
        RECEIVER: 0x0e73...6Ee8
      </text>

      <!-- Deal Review Card -->
      <rect x="310" y="275" width="1300" height="420" rx="16" fill="#090e1a" stroke="#1e293b" stroke-width="1.8"/>

      <g transform="translate(350, 315)">
        <text x="0" y="25" font-family="'Segoe UI', Roboto, monospace" font-size="13" font-weight="800" fill="#93c5fd">
          INCOMING TRANSACTION PROPOSAL (ID: 0x961c...54e1)
        </text>
        <text x="0" y="65" font-family="'Segoe UI', Roboto, sans-serif" font-size="26" font-weight="800" fill="#ffffff">
          Solar Equipment Delivery — Commercial Procurement
        </text>
        <text x="0" y="100" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" fill="#9ca3af">
          Proposed by Initiator: <tspan fill="#c084fc" font-family="monospace">0xf39Fd6...2266 (Buyer)</tspan> • Funded on Monad Testnet
        </text>

        <!-- Terms Comparison Table Grid -->
        <g transform="translate(0, 130)">
          <!-- Row 1 -->
          <rect x="0" y="0" width="590" height="60" rx="10" fill="#111827"/>
          <text x="20" y="37" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" fill="#9ca3af">Deliverable:</text>
          <text x="160" y="37" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" fill="#ffffff">100 Commercial Solar Panels</text>

          <rect x="630" y="0" width="590" height="60" rx="10" fill="#111827"/>
          <text x="650" y="37" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" fill="#9ca3af">Escrow Amount:</text>
          <text x="790" y="37" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="900" fill="#34d399">0.001 MON (Escrow Vault)</text>

          <!-- Row 2 -->
          <rect x="0" y="75" width="590" height="60" rx="10" fill="#111827"/>
          <text x="20" y="112" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" fill="#9ca3af">Designated Verifier:</text>
          <text x="160" y="112" font-family="'Segoe UI', Roboto, monospace" font-size="13" font-weight="700" fill="#22d3ee">0xb064...2c48 (Depot Auditor)</text>

          <rect x="630" y="75" width="590" height="60" rx="10" fill="#111827"/>
          <text x="650" y="112" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" fill="#9ca3af">Delivery Timelock:</text>
          <text x="790" y="112" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" fill="#fbbf24">14 Days from Funding</text>

          <!-- Row 3 -->
          <rect x="0" y="150" width="1220" height="60" rx="10" fill="#111827"/>
          <text x="20" y="187" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" fill="#9ca3af">Evidence Requirements:</text>
          <text x="200" y="187" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" fill="#f472b6">Delivery Bill of Lading + Depot QA Inspection Certificate</text>
        </g>
      </g>

      <!-- Bottom Action Callout -->
      <g transform="translate(310, 720)">
        <rect x="0" y="0" width="1300" height="56" rx="12" fill="#0f172a" stroke="#2563eb" stroke-width="1.5"/>
        <text x="650" y="35" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" fill="#93c5fd" text-anchor="middle">
          ✓ Receiver reviews full explicit parameters before any agreement ratification. No surprise terms.
        </text>
      </g>

      ${renderCursor(1050, 480, 'RECEIVER INSPECTING TERMS')}
    `
  },

  // ==========================================
  // SHOT 07: Receiver Authorization (EIP-191)
  // ==========================================
  {
    id: 'shot07',
    subtitle: "If everything is correct, the receiver explicitly authorizes the agreement. This is where human authorization matters.",
    svgContent: `
      ${renderTopBar('0x0e73...6Ee8', 'RECEIVER')}
      ${renderStepBanner('STEP 6', 'RECEIVER RATIFICATION • HUMAN WALLET AUTHORIZATION', 'EIP-191 SIGNATURE')}

      <!-- Main Container -->
      <rect x="260" y="150" width="1400" height="780" rx="20" fill="#0c101e" stroke="#2563eb" stroke-width="2"/>

      <!-- Modal Dialog: Wallet Ratification -->
      <rect x="440" y="195" width="1040" height="690" rx="20" fill="#0b1324" stroke="#3b82f6" stroke-width="2"/>

      <text x="490" y="255" font-family="'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="900" fill="#ffffff">
        Authorize Agreement Ratification
      </text>
      <text x="490" y="290" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" fill="#9ca3af">
        Cryptographic ratification requires an explicit human signature from the receiver's Monad wallet.
      </text>

      <!-- Terms Hash Check Box -->
      <rect x="490" y="325" width="940" height="130" rx="12" fill="#0f1c34" stroke="#1d4ed8" stroke-width="1.5"/>
      <text x="520" y="360" font-family="'Segoe UI', Roboto, monospace" font-size="12" font-weight="800" fill="#93c5fd">AGREEMENT HASH TO SIGN:</text>
      <text x="520" y="395" font-family="'Segoe UI', Roboto, monospace" font-size="18" font-weight="800" fill="#38bdf8">
        0xebb931936199ae988129d1eed8501a6ad3311035f0d72dd0e52e0c92454a125f
      </text>
      <text x="520" y="430" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" fill="#9ca3af">
        Signer: <tspan fill="#6ee7b7" font-family="monospace">0x0e73dBFf9047423b520FA9fc23a95645fC986Ee8 (Receiver)</tspan>
      </text>

      <!-- Wallet Signature Buttons -->
      <g transform="translate(490, 490)">
        <!-- The Big Ratify Button -->
        <rect x="0" y="0" width="500" height="64" rx="14" fill="#2563eb" stroke="#60a5fa" stroke-width="2"/>
        <text x="250" y="39" font-family="'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="800" fill="#ffffff" text-anchor="middle">
          ✓ SIGN &amp; RATIFY AGREEMENT
        </text>

        <rect x="530" y="0" width="220" height="64" rx="14" fill="#1e293b"/>
        <text x="640" y="39" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" fill="#e5e7eb" text-anchor="middle">
          PROPOSE COUNTER
        </text>

        <rect x="780" y="0" width="160" height="64" rx="14" fill="#450a0a" stroke="#dc2626" stroke-width="1"/>
        <text x="860" y="39" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" fill="#fca5a5" text-anchor="middle">
          REJECT
        </text>
      </g>

      <!-- Non-repudiation Explanation Card -->
      <g transform="translate(490, 590)">
        <rect x="0" y="0" width="940" height="150" rx="14" fill="#08101e" stroke="#1e293b" stroke-width="1.2"/>
        <text x="30" y="35" font-family="'Segoe UI', Roboto, monospace" font-size="12" font-weight="800" fill="#60a5fa">HUMAN AUTHORIZATION INVARIANT</text>
        <text x="30" y="68" font-family="'Segoe UI', Roboto, sans-serif" font-size="17" font-weight="700" fill="#ffffff">
          AI Assists Negotiation — Only Humans Authorize Commitments
        </text>
        <text x="30" y="100" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" fill="#9ca3af">
          • Signature standard: EIP-191 Personal Sign with cryptographic timestamp.
        </text>
        <text x="30" y="125" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" fill="#9ca3af">
          • Authorizes the Monad escrow contract to transition into the funded execution state.
        </text>
      </g>

      ${renderCursor(740, 520, 'CLICK TO SIGN WITH WALLET')}
    `
  },

  // ==========================================
  // SHOT 08: Escrow / Funding (Monad Smart Escrow)
  // ==========================================
  {
    id: 'shot08',
    subtitle: "Once both sides agree, the transaction can move into the escrow-backed lifecycle. The blockchain controls the financial state, not the AI.",
    svgContent: `
      ${renderTopBar('0xf39F...2266', 'BUYER')}
      ${renderStepBanner('STEP 7', 'NON-CUSTODIAL ESCROW • MONAD METROPOLIS TESTNET', 'BLOCKCHAIN ENFORCED')}

      <!-- Main Container -->
      <rect x="260" y="150" width="1400" height="780" rx="20" fill="#0a0e1c" stroke="#3b82f6" stroke-width="2.5"/>

      <!-- Header & Contract Info -->
      <g transform="translate(310, 195)">
        <rect x="0" y="0" width="300" height="42" rx="21" fill="#1e3a8a" stroke="#60a5fa" stroke-width="1.5"/>
        <circle cx="25" cy="21" r="6" fill="#38bdf8"/>
        <text x="45" y="27" font-family="'Segoe UI', Roboto, monospace" font-size="14" font-weight="800" fill="#bfdbfe">
          ESCROW STATE: FUNDED
        </text>
        <text x="1300" y="27" font-family="'Segoe UI', Roboto, monospace" font-size="14" fill="#9ca3af" text-anchor="end">
          Contract: <tspan fill="#38bdf8">0x925ea880cA53DE0352b84B24d0C0dee5B258015A</tspan>
        </text>
      </g>

      <!-- Big Escrow Capital Box -->
      <g transform="translate(310, 265)">
        <rect x="0" y="0" width="620" height="310" rx="16" fill="#0f192b" stroke="#1d4ed8" stroke-width="1.8"/>
        <text x="35" y="45" font-family="'Segoe UI', Roboto, monospace" font-size="13" font-weight="700" fill="#93c5fd">LOCKED COLLATERAL</text>
        <text x="35" y="115" font-family="'Segoe UI', Roboto, sans-serif" font-size="52" font-weight="900" fill="#34d399">0.001 MON</text>
        <text x="35" y="160" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" fill="#9ca3af">Locked in TrustMeshEscrow non-custodial smart vault</text>
        <text x="35" y="195" font-family="'Segoe UI', Roboto, monospace" font-size="14" fill="#6ee7b7">✓ Mathematical Solvency: PASSED</text>
        <text x="35" y="225" font-family="'Segoe UI', Roboto, monospace" font-size="14" fill="#60a5fa">Vault Balance &gt;= Sum(Liabilities)</text>
        
        <rect x="35" y="250" width="320" height="34" rx="8" fill="#1e3a8a"/>
        <text x="195" y="272" font-family="'Segoe UI', Roboto, monospace" font-size="12" font-weight="800" fill="#bfdbfe" text-anchor="middle">
          CHAIN ID 10143 • MONAD METROPOLIS
        </text>

        <!-- Right Side: State Machine Progression -->
        <rect x="660" y="0" width="640" height="310" rx="16" fill="#0f192b" stroke="#1d4ed8" stroke-width="1.8"/>
        <text x="695" y="45" font-family="'Segoe UI', Roboto, monospace" font-size="13" font-weight="700" fill="#93c5fd">FORMAL ONCHAIN STATE MACHINE</text>
        
        <g transform="translate(695, 80)">
          <rect x="0" y="0" width="160" height="38" rx="8" fill="#1e3a8a"/>
          <text x="80" y="24" font-family="'Segoe UI', Roboto, monospace" font-size="13" font-weight="800" fill="#bfdbfe" text-anchor="middle">0: CREATED ✓</text>

          <rect x="180" y="0" width="160" height="38" rx="8" fill="#1e3a8a"/>
          <text x="260" y="24" font-family="'Segoe UI', Roboto, monospace" font-size="13" font-weight="800" fill="#bfdbfe" text-anchor="middle">1: FUNDED ✓</text>

          <rect x="360" y="0" width="200" height="38" rx="8" fill="#2563eb" stroke="#93c5fd" stroke-width="1.5"/>
          <text x="460" y="24" font-family="'Segoe UI', Roboto, monospace" font-size="13" font-weight="800" fill="#ffffff" text-anchor="middle">2: IN_PROGRESS ⚡</text>
        </g>

        <text x="695" y="165" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" fill="#d1d5db">• Buyer funds are locked under smart contract authority.</text>
        <text x="695" y="200" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" fill="#d1d5db">• Neither party nor any AI can unilaterally withdraw capital.</text>
        <text x="695" y="235" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" fill="#d1d5db">• Payout is strictly gated by independent verifier attestation.</text>
      </g>

      <!-- The Core Security Banner -->
      <rect x="310" y="615" width="1300" height="90" rx="16" fill="#1e103a" stroke="#7e22ce" stroke-width="2"/>
      <text x="960" y="660" font-family="'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="900" fill="#f3f4f6" text-anchor="middle">
        THE BLOCKCHAIN CONTROLS THE MONEY — NOT THE AI
      </text>
      <text x="960" y="688" font-family="'Segoe UI', Roboto, monospace" font-size="14" fill="#c084fc" text-anchor="middle">
        AI assists deal structuring • Only Monad smart contracts hold and release capital
      </text>
    `
  },

  // ==========================================
  // SHOT 09: Execution + Evidence Anchoring
  // ==========================================
  {
    id: 'shot09',
    subtitle: "The work happens offchain. When it's complete, evidence is anchored with a cryptographic commitment.",
    svgContent: `
      ${renderTopBar('0x0e73...6Ee8', 'RECEIVER')}
      ${renderStepBanner('STEP 8', 'OFFCHAIN EXECUTION & CRYPTOGRAPHIC EVIDENCE ANCHORING', '/evidence')}

      <!-- Main Container -->
      <rect x="260" y="150" width="1400" height="780" rx="20" fill="#09131a" stroke="#0891b2" stroke-width="2"/>

      <text x="310" y="210" font-family="'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="900" fill="#ffffff">
        Anchored Deliverable Evidence
      </text>
      <text x="310" y="240" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" fill="#9ca3af">
        Execution happens offchain. Only immutable cryptographic commitments are anchored on Monad.
      </text>

      <!-- Evidence Card -->
      <rect x="310" y="275" width="1300" height="340" rx="16" fill="#0f1f29" stroke="#06b6d4" stroke-width="1.8"/>

      <g transform="translate(350, 315)">
        <text x="0" y="25" font-family="'Segoe UI', Roboto, monospace" font-size="13" font-weight="800" fill="#67e8f9">
          SUBMITTED EVIDENCE COMMITMENT:
        </text>
        <text x="0" y="65" font-family="'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="800" fill="#ffffff">
          Dallas Solar Logistics Manifest &amp; QA Inspection Report
        </text>

        <!-- Hash Box -->
        <g transform="translate(0, 95)">
          <rect x="0" y="0" width="1220" height="70" rx="10" fill="#082835" stroke="#0e7490" stroke-width="1.2"/>
          <text x="25" y="28" font-family="'Segoe UI', Roboto, monospace" font-size="11" fill="#67e8f9">KECCAK-256 EVIDENCE DIGEST:</text>
          <text x="25" y="52" font-family="'Segoe UI', Roboto, monospace" font-size="16" font-weight="700" fill="#22d3ee">
            0x08a3297a746536feef50be0689b0bb30f81a704a20b75a1d954cfcb3a2d5edff
          </text>
        </g>

        <!-- Artifacts Grid -->
        <g transform="translate(0, 190)">
          <rect x="0" y="0" width="590" height="65" rx="8" fill="#091c26"/>
          <text x="20" y="38" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" fill="#ffffff">📄 Bill_Of_Lading_100_Panels.pdf</text>
          <text x="560" y="38" font-family="'Segoe UI', Roboto, monospace" font-size="12" fill="#34d399" text-anchor="end">SHA-256 VERIFIED ✓</text>

          <rect x="630" y="0" width="590" height="65" rx="8" fill="#091c26"/>
          <text x="650" y="38" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" fill="#ffffff">📊 Depot_Inspection_Signoff.pdf</text>
          <text x="1190" y="38" font-family="'Segoe UI', Roboto, monospace" font-size="12" fill="#34d399" text-anchor="end">SHA-256 VERIFIED ✓</text>
        </g>
      </g>

      <!-- Bottom Privacy Guarantee Banner -->
      <g transform="translate(310, 650)">
        <rect x="0" y="0" width="1300" height="75" rx="14" fill="#08202d" stroke="#0891b2" stroke-width="1.5"/>
        <text x="650" y="35" font-family="'Segoe UI', Roboto, sans-serif" font-size="17" font-weight="800" fill="#67e8f9" text-anchor="middle">
          Zero Privacy Leakage: Raw commercial documents stay offchain in private storage.
        </text>
        <text x="650" y="60" font-family="'Segoe UI', Roboto, monospace" font-size="13" fill="#a5f3fc" text-anchor="middle">
          Only immutable 32-byte cryptographic hashes are anchored on the Monad blockchain.
        </text>
      </g>
    `
  },

  // ==========================================
  // SHOT 10: Verification (Designated Verifier)
  // ==========================================
  {
    id: 'shot10',
    subtitle: "A designated verifier evaluates that evidence and submits an explicit verification outcome.",
    svgContent: `
      ${renderTopBar('0xb064...2c48', 'VERIFIER')}
      ${renderStepBanner('STEP 9', 'DESIGNATED AUDITOR VERIFICATION', 'INDEPENDENT ATTESTATION')}

      <!-- Main Container -->
      <rect x="260" y="150" width="1400" height="780" rx="20" fill="#081815" stroke="#059669" stroke-width="2"/>

      <text x="310" y="210" font-family="'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="900" fill="#ffffff">
        Designated Verifier Attestation
      </text>
      <text x="310" y="240" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" fill="#9ca3af">
        Auditor node independently evaluates evidence and submits an onchain verification outcome.
      </text>

      <!-- Verifier Terminal Card -->
      <rect x="310" y="275" width="1300" height="370" rx="16" fill="#0b241c" stroke="#10b981" stroke-width="1.8"/>

      <g transform="translate(350, 315)">
        <text x="0" y="25" font-family="'Segoe UI', Roboto, monospace" font-size="13" font-weight="800" fill="#6ee7b7">
          VERIFIER NODE: 0xb064d6023363363321528695d73ca8dcf2f52c48
        </text>

        <!-- Evaluation Checklist Grid -->
        <g transform="translate(0, 55)">
          <rect x="0" y="0" width="590" height="70" rx="10" fill="#063526"/>
          <text x="25" y="42" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" fill="#ffffff">✓ Physical Panel Count: 100/100</text>
          <text x="560" y="42" font-family="'Segoe UI', Roboto, monospace" font-size="13" fill="#34d399" text-anchor="end">CONFORMS</text>

          <rect x="630" y="0" width="590" height="70" rx="10" fill="#063526"/>
          <text x="655" y="42" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" fill="#ffffff">✓ Electrical IV Curve Bench Test</text>
          <text x="1190" y="42" font-family="'Segoe UI', Roboto, monospace" font-size="13" fill="#34d399" text-anchor="end">PASS</text>

          <rect x="0" y="85" width="590" height="70" rx="10" fill="#063526"/>
          <text x="25" y="127" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" fill="#ffffff">✓ Delivery Bill of Lading Sign-off</text>
          <text x="560" y="127" font-family="'Segoe UI', Roboto, monospace" font-size="13" fill="#34d399" text-anchor="end">SIGNED</text>

          <rect x="630" y="85" width="590" height="70" rx="10" fill="#063526"/>
          <text x="655" y="127" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" fill="#ffffff">✓ Cryptographic Evidence Digest Match</text>
          <text x="1190" y="127" font-family="'Segoe UI', Roboto, monospace" font-size="13" fill="#34d399" text-anchor="end">MATCHED</text>
        </g>

        <!-- Outcome Submission Banner -->
        <g transform="translate(0, 245)">
          <rect x="0" y="0" width="1220" height="60" rx="12" fill="#064e3b" stroke="#34d399" stroke-width="1.8"/>
          <text x="610" y="38" font-family="'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="900" fill="#ffffff" text-anchor="middle">
            VERIFICATION OUTCOME SUBMITTED: VERIFY_PASS (STATE 4)
          </text>
        </g>
      </g>

      <!-- Bottom Gated Release Callout -->
      <rect x="310" y="680" width="1300" height="60" rx="12" fill="#0d2e24" stroke="#059669" stroke-width="1.2"/>
      <text x="960" y="717" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" fill="#a7f3d0" text-anchor="middle">
        🔒 Release Gate Unlocked: Smart escrow contracts require this explicit cryptographic pass before funds can settle.
      </text>
    `
  },

  // ==========================================
  // SHOT 11: Onchain Auditability
  // ==========================================
  {
    id: 'shot11',
    subtitle: "Now the transaction state is independently auditable. The blockchain remains authoritative for the financial state.",
    svgContent: `
      ${renderTopBar('0xf39F...2266', 'BUYER')}
      ${renderStepBanner('STEP 10', 'INDEPENDENT ONCHAIN AUDITABILITY', '/trust')}

      <!-- Main Container -->
      <rect x="260" y="150" width="1400" height="780" rx="20" fill="#0a0d18" stroke="#7c3aed" stroke-width="2"/>

      <text x="310" y="210" font-family="'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="900" fill="#ffffff">
        Independently Auditable Transaction Lifecycle
      </text>
      <text x="310" y="240" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" fill="#9ca3af">
        Every milestone is indexed from raw Monad blockchain event logs. Smart contracts are the authoritative financial truth.
      </text>

      <!-- 4 Lifecycle Event Rows -->
      <g transform="translate(310, 270)">
        <!-- Event 1: AgreementCreated -->
        <rect x="0" y="0" width="1300" height="85" rx="12" fill="#0f1426" stroke="#1f2937" stroke-width="1.2"/>
        <circle cx="45" cy="42" r="16" fill="#3b0764"/>
        <text x="45" y="47" font-family="'Segoe UI', Roboto, monospace" font-size="11" font-weight="800" fill="#c084fc" text-anchor="middle">TX</text>
        <text x="85" y="35" font-family="'Segoe UI', Roboto, monospace" font-size="15" font-weight="800" fill="#ffffff">AgreementCreated (Tx ID: 0x961c...54e1)</text>
        <text x="85" y="62" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" fill="#9ca3af">Terms Hash: 0xebb9...125f • Initiator: 0xf39F...2266 • Receiver: 0x0e73...6Ee8</text>
        <rect x="1140" y="26" width="120" height="32" rx="8" fill="#1e103a"/>
        <text x="1200" y="47" font-family="'Segoe UI', Roboto, monospace" font-size="12" font-weight="800" fill="#c084fc" text-anchor="middle">INDEXED ✓</text>

        <!-- Event 2: EscrowFunded -->
        <rect x="0" y="100" width="1300" height="85" rx="12" fill="#0f1426" stroke="#1f2937" stroke-width="1.2"/>
        <circle cx="45" cy="142" r="16" fill="#1e3a8a"/>
        <text x="45" y="147" font-family="'Segoe UI', Roboto, monospace" font-size="11" font-weight="800" fill="#60a5fa" text-anchor="middle">MON</text>
        <text x="85" y="135" font-family="'Segoe UI', Roboto, monospace" font-size="15" font-weight="800" fill="#ffffff">EscrowFunded (0.001 MON Locked)</text>
        <text x="85" y="162" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" fill="#9ca3af">Native Collateral Deposited • Mathematical Solvency Invariant: PASSED</text>
        <rect x="1140" y="126" width="120" height="32" rx="8" fill="#172554"/>
        <text x="1200" y="147" font-family="'Segoe UI', Roboto, monospace" font-size="12" font-weight="800" fill="#60a5fa" text-anchor="middle">INDEXED ✓</text>

        <!-- Event 3: EvidenceAnchored -->
        <rect x="0" y="200" width="1300" height="85" rx="12" fill="#0f1426" stroke="#1f2937" stroke-width="1.2"/>
        <circle cx="45" cy="242" r="16" fill="#164e63"/>
        <text x="45" y="247" font-family="'Segoe UI', Roboto, monospace" font-size="11" font-weight="800" fill="#22d3ee" text-anchor="middle">IPFS</text>
        <text x="85" y="235" font-family="'Segoe UI', Roboto, monospace" font-size="15" font-weight="800" fill="#ffffff">EvidenceAnchored (Keccak-256 Digest)</text>
        <text x="85" y="262" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" fill="#9ca3af">Digest: 0x08a3...edff • Bill of Lading &amp; Inspection Sign-off Anchored</text>
        <rect x="1140" y="226" width="120" height="32" rx="8" fill="#083344"/>
        <text x="1200" y="247" font-family="'Segoe UI', Roboto, monospace" font-size="12" font-weight="800" fill="#22d3ee" text-anchor="middle">INDEXED ✓</text>

        <!-- Event 4: VerificationSubmitted -->
        <rect x="0" y="300" width="1300" height="85" rx="12" fill="#0f1426" stroke="#1f2937" stroke-width="1.2"/>
        <circle cx="45" cy="342" r="16" fill="#064e3b"/>
        <text x="45" y="347" font-family="'Segoe UI', Roboto, monospace" font-size="11" font-weight="800" fill="#34d399" text-anchor="middle">PASS</text>
        <text x="85" y="335" font-family="'Segoe UI', Roboto, monospace" font-size="15" font-weight="800" fill="#ffffff">VerificationAttestation (Auditor: 0xb064...2c48)</text>
        <text x="85" y="362" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" fill="#9ca3af">Outcome: VERIFY_PASS • Independent Attestation Validated Onchain</text>
        <rect x="1140" y="326" width="120" height="32" rx="8" fill="#064e3b"/>
        <text x="1200" y="347" font-family="'Segoe UI', Roboto, monospace" font-size="12" font-weight="800" fill="#34d399" text-anchor="middle">INDEXED ✓</text>
      </g>

      <!-- Bottom Indexing Assurance -->
      <rect x="310" y="700" width="1300" height="60" rx="12" fill="#131028" stroke="#7e22ce" stroke-width="1.2"/>
      <text x="960" y="737" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" fill="#d8b4fe" text-anchor="middle">
        Transparent Event Streaming • Zero Hidden Database State • Monad Smart Contracts Authoritative
      </text>
    `
  },

  // ==========================================
  // SHOT 12: Settlement (Verified Flow A Onchain)
  // ==========================================
  {
    id: 'shot12',
    subtitle: "After the required conditions are satisfied, the transaction reaches onchain settlement.",
    svgContent: `
      ${renderTopBar('0x0e73...6Ee8', 'RECEIVER')}
      ${renderStepBanner('STEP 11', 'ONCHAIN SETTLEMENT • MONAD METROPOLIS TESTNET', 'STATE 11: SETTLED')}

      <!-- Main Settlement Card -->
      <rect x="260" y="150" width="1400" height="780" rx="20" fill="#081812" stroke="#059669" stroke-width="2.5"/>

      <!-- Inner Content -->
      <g transform="translate(320, 200)">
        <!-- Big Settled Ribbon -->
        <rect x="0" y="0" width="240" height="42" rx="21" fill="#064e3b" stroke="#34d399" stroke-width="1.8"/>
        <circle cx="24" cy="21" r="7" fill="#34d399"/>
        <text x="45" y="27" font-family="'Segoe UI', Roboto, monospace" font-size="15" font-weight="800" fill="#ffffff">
          STATE 11: SETTLED
        </text>

        <!-- Settlement Tx Hash Box -->
        <text x="0" y="85" font-family="'Segoe UI', Roboto, monospace" font-size="13" font-weight="700" fill="#a7f3d0">
          GENUINE MONAD TESTNET SETTLEMENT TRANSACTION HASH:
        </text>
        <rect x="0" y="100" width="1280" height="70" rx="12" fill="#062e21" stroke="#10b981" stroke-width="1.5"/>
        <text x="640" y="143" font-family="'Segoe UI', Roboto, monospace" font-size="20" font-weight="800" fill="#6ee7b7" text-anchor="middle">
          0x691f7a80d65fe1deece2f45e8b6600ee4b2b0ffc14f3fe733d995566e2d83b52
        </text>

        <!-- Payout Flow Grid -->
        <g transform="translate(0, 205)">
          <rect x="0" y="0" width="610" height="190" rx="16" fill="#0b241a" stroke="#059669" stroke-width="1.2"/>
          <text x="35" y="45" font-family="'Segoe UI', Roboto, monospace" font-size="13" fill="#6ee7b7">ESCROW RECIPIENT (SELLER)</text>
          <text x="35" y="88" font-family="'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="800" fill="#ffffff">Dallas Solar Supply Co.</text>
          <text x="35" y="125" font-family="'Segoe UI', Roboto, monospace" font-size="13" fill="#9ca3af">0x0e73dBFf9047423b520FA9fc23a95645fC986Ee8</text>
          <text x="35" y="160" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="800" fill="#34d399">Payout Dispatched: 100% (0.001 MON Received)</text>

          <rect x="670" y="0" width="610" height="190" rx="16" fill="#0b241a" stroke="#059669" stroke-width="1.2"/>
          <text x="705" y="45" font-family="'Segoe UI', Roboto, monospace" font-size="13" fill="#6ee7b7">SETTLEMENT PROOF METRICS</text>
          <text x="705" y="88" font-family="'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="800" fill="#ffffff">Settlement Block: 66436615</text>
          <text x="705" y="125" font-family="'Segoe UI', Roboto, monospace" font-size="13" fill="#9ca3af">TrustMeshEscrow: 0x925ea8...015A</text>
          <text x="705" y="160" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="800" fill="#6ee7b7">Terminal &amp; Non-Reversible Settlement</text>
        </g>

        <!-- Monad Explorer Callout -->
        <g transform="translate(0, 430)">
          <rect x="0" y="0" width="1280" height="60" rx="12" fill="#063d2c" stroke="#10b981" stroke-width="1.5"/>
          <text x="640" y="37" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="800" fill="#a7f3d0" text-anchor="middle">
            VERIFIED ON MONAD METROPOLIS TESTNET (CHAIN ID 10143) • BLOCK 66436615 ↗
          </text>
        </g>
      </g>
    `
  },

  // ==========================================
  // SHOT 13: Trust Receipt
  // ==========================================
  {
    id: 'shot13',
    subtitle: "And the result becomes a Trust Receipt: linking the agreement, evidence, verification outcome, and settlement into one durable record.",
    svgContent: `
      ${renderTopBar('0x0e73...6Ee8', 'RECEIVER')}
      ${renderStepBanner('STEP 12', 'VERIQOMESH TRUST RECEIPT REGISTRY', 'SOULBOUND PROOF #3')}

      <!-- The Big Trust Receipt Certificate -->
      <rect x="340" y="150" width="1240" height="780" rx="24" fill="#14110a" stroke="#f59e0b" stroke-width="2.5"/>

      <!-- Golden Seal / Emblem -->
      <g transform="translate(400, 200)">
        <rect x="0" y="0" width="220" height="38" rx="8" fill="#78350f" stroke="#fbbf24" stroke-width="1.5"/>
        <text x="110" y="24" font-family="'Segoe UI', Roboto, monospace" font-size="14" font-weight="800" fill="#fef3c7" text-anchor="middle">
          SOULBOUND RECEIPT #3
        </text>

        <!-- Certificate Title -->
        <text x="0" y="80" font-family="'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="900" fill="#ffffff">
          Proof of Commercial Fulfillment &amp; Settlement
        </text>
        <text x="0" y="110" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" fill="#d97706">
          TrustReceiptRegistry (0xE1994e0dF7CD5A836be4b02AE2164A542418B819) • Monad Metropolis Testnet
        </text>

        <!-- The 4 Core Links in the Receipt -->
        <g transform="translate(0, 140)">
          <!-- Row 1: Agreement -->
          <rect x="0" y="0" width="1120" height="68" rx="10" fill="#241909" stroke="#78350f" stroke-width="1"/>
          <text x="30" y="42" font-family="'Segoe UI', Roboto, monospace" font-size="12" font-weight="800" fill="#fbbf24">1. AGREEMENT</text>
          <text x="180" y="42" font-family="'Segoe UI', Roboto, monospace" font-size="14" fill="#fef3c7">Terms Hash: 0xebb931936199ae988129d1eed8501a6ad3311035f0d72dd0e52e0c92454a125f</text>

          <!-- Row 2: Evidence -->
          <rect x="0" y="82" width="1120" height="68" rx="10" fill="#241909" stroke="#78350f" stroke-width="1"/>
          <text x="30" y="124" font-family="'Segoe UI', Roboto, monospace" font-size="12" font-weight="800" fill="#fbbf24">2. EVIDENCE</text>
          <text x="180" y="124" font-family="'Segoe UI', Roboto, monospace" font-size="14" fill="#fef3c7">Evidence Root: 0x08a3297a746536feef50be0689b0bb30f81a704a20b75a1d954cfcb3a2d5edff</text>

          <!-- Row 3: Verification -->
          <rect x="0" y="164" width="1120" height="68" rx="10" fill="#241909" stroke="#78350f" stroke-width="1"/>
          <text x="30" y="206" font-family="'Segoe UI', Roboto, monospace" font-size="12" font-weight="800" fill="#fbbf24">3. VERIFICATION</text>
          <text x="180" y="206" font-family="'Segoe UI', Roboto, monospace" font-size="14" fill="#fef3c7">Outcome: VERIFY_PASS • Attestor: 0xb064d6023363363321528695d73ca8dcf2f52c48</text>

          <!-- Row 4: Settlement -->
          <rect x="0" y="246" width="1120" height="68" rx="10" fill="#241909" stroke="#78350f" stroke-width="1"/>
          <text x="30" y="288" font-family="'Segoe UI', Roboto, monospace" font-size="12" font-weight="800" fill="#fbbf24">4. SETTLEMENT</text>
          <text x="180" y="288" font-family="'Segoe UI', Roboto, monospace" font-size="14" fill="#fef3c7">Settlement Tx: 0x691f7a80d65fe1deece2f45e8b6600ee4b2b0ffc14f3fe733d995566e2d83b52</text>
        </g>

        <!-- Bottom Guarantee -->
        <g transform="translate(0, 480)">
          <rect x="0" y="0" width="1120" height="52" rx="10" fill="#451a03"/>
          <text x="560" y="32" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="800" fill="#fef3c7" text-anchor="middle">
            DURABLE, NON-TRANSFERABLE ONCHAIN PROOF OF COMMERCIAL REPUTATION
          </text>
        </g>
      </g>
    `
  },

  // ==========================================
  // SHOT 14: Security Principle (The 4 Pillars)
  // ==========================================
  {
    id: 'shot14',
    subtitle: "AI assists. Humans authorize. Verifiers verify. Blockchain enforces.",
    svgContent: `
      <!-- Deep dark background -->
      <radialGradient id="secGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#4c1d95" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#07080d" stop-opacity="0"/>
      </radialGradient>
      <rect x="0" y="0" width="1920" height="1080" fill="url(#secGlow)"/>

      <text x="960" y="160" font-family="'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">
        THE VERIQOMESH SECURITY MODEL
      </text>
      <text x="960" y="210" font-family="'Segoe UI', Roboto, sans-serif" font-size="20" fill="#c084fc" text-anchor="middle">
        The Non-Negotiable AI Commerce Firewall
      </text>

      <!-- 4 High Impact Cards Grid -->
      <g transform="translate(180, 270)">
        <!-- 1: AI Assists -->
        <rect x="0" y="0" width="360" height="500" rx="20" fill="#140f26" stroke="#9333ea" stroke-width="2.5"/>
        <circle cx="180" cy="90" r="45" fill="#3b0764" stroke="#a855f7" stroke-width="2"/>
        <text x="180" y="100" font-family="'Segoe UI', Roboto, sans-serif" font-size="36" fill="#c084fc" text-anchor="middle">🤖</text>
        <text x="180" y="180" font-family="'Segoe UI', Roboto, sans-serif" font-size="26" font-weight="900" fill="#ffffff" text-anchor="middle">AI Assists</text>
        <text x="180" y="215" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" fill="#c084fc" text-anchor="middle">Intent &amp; Structuring</text>
        <line x1="40" y1="245" x2="320" y2="245" stroke="#2e1065" stroke-width="1.5"/>
        <text x="40" y="290" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" fill="#d1d5db">• Analyzes plain English intent</text>
        <text x="40" y="325" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" fill="#d1d5db">• Decomposes parameters</text>
        <text x="40" y="360" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" fill="#d1d5db">• Structures evidence policy</text>
        <rect x="30" y="415" width="300" height="50" rx="12" fill="#4c1d95" fill-opacity="0.5"/>
        <text x="180" y="446" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800" fill="#e9d5ff" text-anchor="middle">ZERO FINANCIAL AUTHORITY</text>

        <!-- 2: Humans Authorize -->
        <rect x="395" y="0" width="360" height="500" rx="20" fill="#0f172a" stroke="#2563eb" stroke-width="2.5"/>
        <circle cx="575" cy="90" r="45" fill="#1e3a8a" stroke="#60a5fa" stroke-width="2"/>
        <text x="575" y="100" font-family="'Segoe UI', Roboto, sans-serif" font-size="36" fill="#93c5fd" text-anchor="middle">✍️</text>
        <text x="575" y="180" font-family="'Segoe UI', Roboto, sans-serif" font-size="26" font-weight="900" fill="#ffffff" text-anchor="middle">Humans Authorize</text>
        <text x="575" y="215" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" fill="#60a5fa" text-anchor="middle">Wallet Ratification</text>
        <line x1="435" y1="245" x2="715" y2="245" stroke="#1e293b" stroke-width="1.5"/>
        <text x="435" y="290" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" fill="#d1d5db">• EIP-191 wallet signature</text>
        <text x="435" y="325" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" fill="#d1d5db">• Buyer explicitly approves escrow</text>
        <text x="435" y="360" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" fill="#d1d5db">• Seller ratifies canonical terms</text>
        <rect x="425" y="415" width="300" height="50" rx="12" fill="#1e40af" fill-opacity="0.5"/>
        <text x="575" y="446" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800" fill="#bfdbfe" text-anchor="middle">NO AI CAN SIGN ONCHAIN</text>

        <!-- 3: Verifiers Verify -->
        <rect x="790" y="0" width="360" height="500" rx="20" fill="#141a1c" stroke="#0891b2" stroke-width="2.5"/>
        <circle cx="970" cy="90" r="45" fill="#155e75" stroke="#22d3ee" stroke-width="2"/>
        <text x="970" y="100" font-family="'Segoe UI', Roboto, sans-serif" font-size="36" fill="#67e8f9" text-anchor="middle">🛡️</text>
        <text x="970" y="180" font-family="'Segoe UI', Roboto, sans-serif" font-size="26" font-weight="900" fill="#ffffff" text-anchor="middle">Verifiers Verify</text>
        <text x="970" y="215" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" fill="#22d3ee" text-anchor="middle">Deliverable Attestation</text>
        <line x1="830" y1="245" x2="1110" y2="245" stroke="#1e293b" stroke-width="1.5"/>
        <text x="830" y="290" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" fill="#d1d5db">• Independent auditor node</text>
        <text x="830" y="325" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" fill="#d1d5db">• Audits offchain proof artifacts</text>
        <text x="830" y="360" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" fill="#d1d5db">• Issues PASS / FAIL onchain</text>
        <rect x="820" y="415" width="300" height="50" rx="12" fill="#0e7490" fill-opacity="0.5"/>
        <text x="970" y="446" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800" fill="#a5f3fc" text-anchor="middle">GATED PAYOUT RELEASE</text>

        <!-- 4: Blockchain Enforces -->
        <rect x="1185" y="0" width="360" height="500" rx="20" fill="#0f2019" stroke="#059669" stroke-width="2.5"/>
        <circle cx="1365" cy="90" r="45" fill="#064e3b" stroke="#34d399" stroke-width="2"/>
        <text x="1365" y="100" font-family="'Segoe UI', Roboto, sans-serif" font-size="36" fill="#6ee7b7" text-anchor="middle">⛓️</text>
        <text x="1365" y="180" font-family="'Segoe UI', Roboto, sans-serif" font-size="26" font-weight="900" fill="#ffffff" text-anchor="middle">Blockchain Enforces</text>
        <text x="1365" y="215" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" fill="#34d399" text-anchor="middle">Monad Smart Escrow</text>
        <line x1="1225" y1="245" x2="1505" y2="245" stroke="#1e293b" stroke-width="1.5"/>
        <text x="1225" y="290" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" fill="#d1d5db">• Non-custodial vault solvency</text>
        <text x="1225" y="325" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" fill="#d1d5db">• Mathematical state invariant</text>
        <text x="1225" y="360" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" fill="#d1d5db">• Irreversible payout settlement</text>
        <rect x="1215" y="415" width="300" height="50" rx="12" fill="#047857" fill-opacity="0.5"/>
        <text x="1365" y="446" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800" fill="#a7f3d0" text-anchor="middle">IMMUTABLE MONAD ESCROW</text>
      </g>

      <!-- Bottom Headline -->
      <rect x="410" y="810" width="1100" height="60" rx="16" fill="#0b0d18" stroke="#374151" stroke-width="1.5"/>
      <text x="960" y="847" font-family="'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="800" fill="#ffffff" text-anchor="middle">
        AI assists. <tspan fill="#60a5fa">Humans authorize.</tspan> <tspan fill="#22d3ee">Verifiers verify.</tspan> <tspan fill="#34d399">Blockchain enforces.</tspan>
      </text>
    `
  },

  // ==========================================
  // SHOT 15: Final Brand
  // ==========================================
  {
    id: 'shot15',
    subtitle: "VeriqoMesh.",
    svgContent: `
      <!-- Epic Final Brand Screen -->
      <radialGradient id="finalGlow" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.5"/>
        <stop offset="50%" stop-color="#1e1b4b" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="#07080d" stop-opacity="0"/>
      </radialGradient>
      <rect x="0" y="0" width="1920" height="1080" fill="url(#finalGlow)"/>

      <!-- Monad Badge Top Left -->
      <rect x="80" y="80" width="380" height="50" rx="25" fill="#1e103a" stroke="#7e22ce" stroke-width="2"/>
      <circle cx="110" cy="105" r="7" fill="#a855f7"/>
      <text x="135" y="112" font-family="'Segoe UI', Roboto, sans-serif" font-size="17" font-weight="800" fill="#e9d5ff">
        MONAD METROPOLIS TESTNET
      </text>

      <!-- Track Badge Top Right -->
      <rect x="1460" y="80" width="380" height="50" rx="25" fill="#0f172a" stroke="#2563eb" stroke-width="2"/>
      <text x="1650" y="112" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" fill="#93c5fd" text-anchor="middle">
        Trust &amp; AI Infrastructure Track
      </text>

      <!-- Center Typography -->
      <text x="960" y="600" font-family="'Segoe UI', Roboto, sans-serif" font-size="76" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2">
        VERIQOMESH <tspan fill="#c084fc">NETWORK</tspan>
      </text>

      <text x="960" y="675" font-family="'Segoe UI', Roboto, sans-serif" font-size="34" font-weight="700" fill="#e5e7eb" text-anchor="middle">
        Trust. Verify. Transact.
      </text>

      <text x="960" y="730" font-family="'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="600" fill="#9ca3af" text-anchor="middle">
        The Programmable Trust Layer for Human &amp; AI Commerce on Monad
      </text>

      <!-- URL Badge -->
      <rect x="740" y="800" width="440" height="60" rx="30" fill="#7c3aed"/>
      <text x="960" y="838" font-family="'Segoe UI', Roboto, monospace" font-size="24" font-weight="800" fill="#ffffff" text-anchor="middle">
        https://veriqomesh.xyz
      </text>
    `,
    hasLogoTop: true
  }
];

// Composite and generate PNG frames using Sharp
async function generateAllFrames() {
  console.log('================================================================');
  console.log('GENERATING 15 MASTER 1080P VIDEO FRAMES');
  console.log('Resolution: 1920x1080 • Color: sRGB • Target: Sharp Tech-News Walkthrough');
  console.log('================================================================');

  const logoBuffer = await sharp(logoPath).resize(260, 260, { fit: 'contain' }).png().toBuffer();
  const markBuffer = await sharp(markPath).resize(54, 54, { fit: 'contain' }).png().toBuffer();

  for (const shot of shotDefinitions) {
    const framePngPath = path.join(outDir, `${shot.id}.png`);

    const fullSvg = `
      <svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
        <rect width="1920" height="1080" fill="#07080d"/>
        ${shot.svgContent}
        ${renderSubtitleBar(shot.subtitle)}
      </svg>
    `;

    const composites = [];

    // Add top left logo on standard frames
    if (!shot.hasLogoTop) {
      composites.push({ input: markBuffer, left: 18, top: 8 });
    } else {
      // Large center logo on Shot 01 and Shot 15
      composites.push({ input: logoBuffer, left: Math.round((1920 - 260) / 2), top: 120 });
    }

    const frameImage = await sharp(Buffer.from(fullSvg))
      .composite(composites)
      .png()
      .toBuffer();

    fs.writeFileSync(framePngPath, frameImage);
    console.log(`  [OK] Generated frame: ${shot.id}.png`);
  }

  // Generate Hackathon Submission Thumbnail
  console.log('\nGenerating veriqomesh-hackathon-submission-thumbnail.png (1920x1080)...');
  const thumbSvg = `
    <svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
      <rect width="1920" height="1080" fill="#07080d"/>
      <radialGradient id="thumbGlow" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.5"/>
        <stop offset="60%" stop-color="#1e1b4b" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="#07080d" stop-opacity="0"/>
      </radialGradient>
      <rect width="1920" height="1080" fill="url(#thumbGlow)"/>

      <!-- Monad Badge -->
      <rect x="80" y="80" width="380" height="50" rx="25" fill="#1e103a" stroke="#7e22ce" stroke-width="2"/>
      <circle cx="110" cy="105" r="7" fill="#a855f7"/>
      <text x="135" y="112" font-family="'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="800" fill="#e9d5ff">
        MONAD METROPOLIS TESTNET
      </text>

      <!-- Track Badge -->
      <rect x="1460" y="80" width="380" height="50" rx="25" fill="#0f172a" stroke="#2563eb" stroke-width="2"/>
      <text x="1650" y="112" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" fill="#93c5fd" text-anchor="middle">
        Trust &amp; AI Infrastructure Track
      </text>

      <!-- Center Typography -->
      <text x="960" y="580" font-family="'Segoe UI', Roboto, sans-serif" font-size="76" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2">
        VERIQOMESH <tspan fill="#c084fc">NETWORK</tspan>
      </text>

      <text x="960" y="650" font-family="'Segoe UI', Roboto, sans-serif" font-size="32" font-weight="700" fill="#e5e7eb" text-anchor="middle">
        Fast, Live Product Walkthrough
      </text>

      <!-- 4 Pillars Ribbon -->
      <rect x="360" y="720" width="1200" height="76" rx="20" fill="#0c0e1a" stroke="#7c3aed" stroke-width="2.5"/>
      <text x="960" y="768" font-family="'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="800" fill="#ffffff" text-anchor="middle">
        AI assists. <tspan fill="#60a5fa">Humans authorize.</tspan> <tspan fill="#fbbf24">Verifiers verify.</tspan> <tspan fill="#34d399">Blockchain enforces.</tspan>
      </text>

      <!-- URL Badge -->
      <rect x="760" y="840" width="400" height="54" rx="27" fill="#7c3aed"/>
      <text x="960" y="875" font-family="'Segoe UI', Roboto, monospace" font-size="22" font-weight="800" fill="#ffffff" text-anchor="middle">
        veriqomesh.xyz
      </text>
    </svg>
  `;

  const thumbLogo = await sharp(logoPath).resize(280, 280, { fit: 'contain' }).png().toBuffer();
  const thumbBuffer = await sharp(Buffer.from(thumbSvg))
    .composite([{ input: thumbLogo, left: Math.round((1920 - 280) / 2), top: 190 }])
    .png()
    .toBuffer();

  fs.writeFileSync('veriqomesh-hackathon-submission-thumbnail.png', thumbBuffer);
  console.log('  [OK] Saved veriqomesh-hackathon-submission-thumbnail.png in root repository');
}

generateAllFrames().catch(console.error);
