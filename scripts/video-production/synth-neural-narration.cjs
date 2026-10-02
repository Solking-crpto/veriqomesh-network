const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SHOTS = [
  {
    id: "shot01",
    name: "Hook",
    text: "What happens when AI helps negotiate a deal, but cannot control the money? Let's actually run the deal.",
    minDur: 8.0,
    targetDur: 10.0
  },
  {
    id: "shot02",
    name: "Connect Wallet / Identity",
    text: "First, connect your Monad wallet. That wallet is your identity inside VeriqoMesh, so the application knows which side of the transaction you're authorized to act for.",
    minDur: 12.0,
    targetDur: 15.0
  },
  {
    id: "shot03",
    name: "Initiator Creates Deal",
    text: "Now I'm the initiator. I start with a plain-English commercial need. What am I buying? How much does it cost? Who receives the payment? Who verifies the result? And what evidence proves the work is complete? VeriqoMesh turns that intent into explicit agreement parameters.",
    minDur: 22.0,
    targetDur: 27.0
  },
  {
    id: "shot04",
    name: "Agreement Parameters",
    text: "Now the deal is explicit. Deliverable. Amount. Deadline. Receiver. Verifier. Evidence requirements. No hidden assumptions.",
    minDur: 10.0,
    targetDur: 13.0
  },
  {
    id: "shot05",
    name: "Deterministic Commitment",
    text: "Before money moves, those terms are deterministically represented and cryptographically committed. Same agreement. Same terms.",
    minDur: 8.0,
    targetDur: 10.0
  },
  {
    id: "shot06",
    name: "Receiver Workflow",
    text: "Now switch to the receiver. The receiver gets the actual agreement, not a vague notification. They can review exactly what was proposed: the amount, the deliverable, the deadline, the verifier, and the evidence requirements.",
    minDur: 17.0,
    targetDur: 23.0
  },
  {
    id: "shot07",
    name: "Receiver Authorization",
    text: "If everything is correct, the receiver explicitly authorizes the agreement. This is where human authorization matters.",
    minDur: 9.0,
    targetDur: 12.0
  },
  {
    id: "shot08",
    name: "Escrow / Funding",
    text: "Once both sides agree, the transaction can move into the escrow-backed lifecycle. The blockchain controls the financial state, not the AI.",
    minDur: 9.0,
    targetDur: 12.0
  },
  {
    id: "shot09",
    name: "Execution + Evidence",
    text: "The work happens offchain. When it's complete, evidence is anchored with a cryptographic commitment.",
    minDur: 8.0,
    targetDur: 11.0
  },
  {
    id: "shot10",
    name: "Verification",
    text: "A designated verifier evaluates that evidence and submits an explicit verification outcome.",
    minDur: 9.0,
    targetDur: 12.0
  },
  {
    id: "shot11",
    name: "Onchain Auditability",
    text: "Now the transaction state is independently auditable. The blockchain remains authoritative for the financial state.",
    minDur: 9.0,
    targetDur: 11.0
  },
  {
    id: "shot12",
    name: "Settlement",
    text: "After the required conditions are satisfied, the transaction reaches onchain settlement.",
    minDur: 7.0,
    targetDur: 10.0
  },
  {
    id: "shot13",
    name: "Trust Receipt",
    text: "And the result becomes a Trust Receipt: linking the agreement, evidence, verification outcome, and settlement into one durable record.",
    minDur: 7.0,
    targetDur: 9.0
  },
  {
    id: "shot14",
    name: "Security Principle",
    text: "AI assists. Humans authorize. Verifiers verify. Blockchain enforces.",
    minDur: 4.0,
    targetDur: 5.0
  },
  {
    id: "shot15",
    name: "Final Brand",
    text: "VeriqoMesh.",
    minDur: 2.0,
    targetDur: 3.0
  }
];

async function synthesizeShot(tts, shot, audioDir) {
  const mp3Path = path.join(audioDir, `${shot.id}.mp3`);
  const wavPath = path.join(audioDir, `${shot.id}.wav`);

  // Rate +10% gives crisp energetic presenter pace (~160-170 WPM)
  const { audioStream } = tts.toStream(shot.text, { rate: '+10%', pitch: '+0Hz' });
  const writeStream = fs.createWriteStream(mp3Path);
  audioStream.pipe(writeStream);
  
  await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });

  // Convert to clean 44.1kHz stereo WAV with slight dynamic compression & EQ for presenter clarity
  execSync(`ffmpeg -y -i "${mp3Path}" -ar 44100 -ac 2 "${wavPath}"`, { stdio: 'pipe' });

  // Probe duration
  let dur = 0;
  try {
    execSync(`ffmpeg -i "${wavPath}"`, { stdio: 'pipe' });
  } catch (err) {
    const ffprobeOut = (err.stdout || '') + (err.stderr || '');
    const match = ffprobeOut.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
    if (match) {
      dur = parseFloat(match[1]) * 3600 + parseFloat(match[2]) * 60 + parseFloat(match[3]);
    }
  }

  return dur;
}

async function main() {
  const audioDir = path.resolve(__dirname, 'audio');
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

  const voice = process.argv[2] || 'en-US-ChristopherNeural';
  console.log(`================================================================`);
  console.log(`SYNTHESIZING NEURAL VOICE-OVER FOR 15 SHOTS`);
  console.log(`Voice: ${voice} • Rate: +10% (Tech presenter cadence)`);
  console.log(`================================================================`);

  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, {});
  let totalSpokenDuration = 0;
  const shotResults = [];

  for (const shot of SHOTS) {
    console.log(`Synthesizing ${shot.id} (${shot.name})...`);
    const dur = await synthesizeShot(tts, shot, audioDir);
    totalSpokenDuration += dur;
    shotResults.push({ ...shot, spokenDur: dur });
    console.log(`  Spoken duration: ${dur.toFixed(2)}s | Target duration: ${shot.targetDur}s`);
  }

  // Calculate timeline durations
  // Video duration target: ~174-177s (2:54 - 2:57), strictly <= 180s
  console.log(`\n================================================================`);
  console.log(`TOTAL SPOKEN AUDIO: ${totalSpokenDuration.toFixed(2)}s`);
  console.log(`================================================================\n`);

  // Print recommended timeline
  let totalAllocated = 0;
  console.log(`SHOT TIMELINE BREAKDOWN:`);
  for (const s of shotResults) {
    // Each shot duration is max of (spokenDur + 0.8s breath/transition) and targetDur
    const segDur = Math.max(Math.ceil((s.spokenDur + 0.6) * 10) / 10, s.minDur);
    totalAllocated += segDur;
    console.log(`  ${s.id}: spoken ${s.spokenDur.toFixed(2)}s -> segment ${segDur.toFixed(1)}s (min ${s.minDur}s)`);
  }
  console.log(`\nSum of segment durations: ${totalAllocated.toFixed(1)}s (${Math.floor(totalAllocated/60)}:${Math.floor(totalAllocated%60).toString().padStart(2, '0')})`);

  fs.writeFileSync(path.join(__dirname, 'shot-durations.json'), JSON.stringify(shotResults, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
