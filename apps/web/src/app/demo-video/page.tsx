'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface Scene {
  id: number;
  key: string;
  title: string;
  duration: number; // in seconds
  audioSrc: string;
  narration: string;
  caption: string;
  highlightedPhrase?: string;
}

const SCENES: Scene[] = [
  {
    id: 1,
    key: 'scene1',
    title: 'Hook & Core Infrastructure Architecture',
    duration: 43.75,
    audioSrc: '/audio/scene1.wav',
    narration:
      'Today, commerce still depends heavily on trust between parties -- and that becomes even harder when humans, businesses, and AI agents transact with each other. VeriqoMesh is programmable trust infrastructure for human and AI commerce. Authorized AI agents can execute normal transactions within policy bounds. Evidence and verification establish what happened. And when an outcome is genuinely contested, AI organizes the evidence, humans adjudicate, and the blockchain enforces the authorized settlement. AI executes. Humans adjudicate. Blockchain enforces.',
    caption:
      'VeriqoMesh Network is programmable trust infrastructure for human and AI commerce. AI executes. Humans adjudicate. Blockchain enforces.',
    highlightedPhrase: 'AI executes. Humans adjudicate. Blockchain enforces.',
  },
  {
    id: 2,
    key: 'scene2',
    title: 'The Dual-Track Architecture Model',
    duration: 19.82,
    audioSrc: '/audio/scene2.wav',
    narration:
      'The important design choice is that human intervention is not required for every transaction. Normal transactions can be executed autonomously by an authorized AI agent. Human adjudication is reserved for the exception -- when evidence becomes inconclusive or the outcome is contested.',
    caption:
      'NORMAL: AI Agent → Execute → Verify → Settle  |  CONTESTED: Protect → Investigate → Adjudicate → Settle',
    highlightedPhrase: 'Human adjudication is reserved for the exception',
  },
  {
    id: 3,
    key: 'scene3',
    title: 'Demo A: Autonomous AI Agent Execution',
    duration: 39.57,
    audioSrc: '/audio/scene3.wav',
    narration:
      'Here is the normal path. The transaction begins with an authorized AI agent operating within a predefined policy. The agent can create the agreement, fund the protected transaction, coordinate execution, and provide evidence. An independent verifier evaluates the evidence. When verification returns PASS, the settlement condition is satisfied. Under the buyer agent\'s pre-approved mandate, the authorized agent executes releaseEscrow() autonomously, without requiring a human to manually approve every normal transaction.',
    caption:
      'Verification: PASS satisfies settlement condition; authorized agent executes releaseEscrow() autonomously with zero human delays.',
    highlightedPhrase: 'Verification: PASS → Autonomous Release Unlocked',
  },
  {
    id: 4,
    key: 'scene4',
    title: 'Why Contested Transactions Are Different',
    duration: 19.99,
    audioSrc: '/audio/scene4.wav',
    narration:
      'But commerce has a harder case. What happens when the evidence does not establish a clear outcome? VeriqoMesh does not give the AI unilateral authority to decide the dispute. The transaction remains protected, and the dispute moves into structured human adjudication.',
    caption:
      'WHEN EVIDENCE IS CLEAR: AUTONOMY  |  WHEN EVIDENCE IS CONTESTED: ADJUDICATION',
    highlightedPhrase: 'Escrow Protected → Structured Human Adjudication',
  },
  {
    id: 5,
    key: 'scene5',
    title: 'Demo B: Live Monad Testnet Record & Advisory AI Dossier',
    duration: 34.64,
    audioSrc: '/audio/scene5.wav',
    narration:
      'This is the live Monad testnet dispute record. The transaction reached verification, but the evidence was inconclusive. That prevented the normal release path and moved the transaction into dispute. AI is still useful here. It organizes the timeline, compares evidence, identifies contradictions, and prepares a structured dossier for the human adjudicators. But the AI dossier is advisory. It does not vote, authorize settlement, or control the funds.',
    caption:
      'Canonical Monad Tx 0x2b57...cfc4: INCONCLUSIVE verification halts release. AI Dossier is advisory only (zero financial or voting authority).',
    highlightedPhrase: 'AI Analyzed -- Human Review Required (Zero Financial Authority)',
  },
  {
    id: 6,
    key: 'scene6',
    title: 'Stage 4: 3-Judge Quorum & Deterministic Consensus',
    duration: 28.09,
    audioSrc: '/audio/scene6.wav',
    narration:
      'Three assigned judges independently submitted signed ballots. Their positions were one thousand, fifteen hundred, and two thousand basis points. The deterministic consensus rule takes the median. That produces fifteen hundred basis points, with a spread of one thousand basis points -- below the polarization threshold. The result is therefore eligible for the settlement authorization path.',
    caption:
      '3 Independent Signed Ballots [1000, 1500, 2000 BPS] → Median: 1500 BPS (Non-Polarized spread 1000 <= 4000).',
    highlightedPhrase: '3 Independent Signed Ballots → Median: 1500 BPS',
  },
  {
    id: 7,
    key: 'scene7',
    title: 'Settlement Authorization Gate & Blockchain Proof',
    duration: 22.73,
    audioSrc: '/audio/scene7.wav',
    narration:
      'Once the adjudication satisfies the authorization rules, the designated resolver dispatches the existing onchain settlement primitive. The blockchain enforces the final state. This live transaction reached State 11 -- SETTLED. The resulting VeriqoMesh Trust Receipt is an accountability record of what happened.',
    caption:
      'Resolver 0x12f9...c35E dispatches tx 0x91ff...84ba on Monad Testnet → State 11 SETTLED → Trust Receipt #2 issued.',
    highlightedPhrase: 'State 11 -- SETTLED | Trust Receipt #2',
  },
  {
    id: 8,
    key: 'scene8',
    title: 'The System Architecture in One View',
    duration: 14.06,
    audioSrc: '/audio/scene8.wav',
    narration:
      'That is the VeriqoMesh model. Autonomy where the transaction is clear. Accountability where the outcome is contested. And deterministic blockchain enforcement at the settlement layer.',
    caption:
      'Autonomy for clear transactions. Accountability for contested outcomes. Deterministic blockchain enforcement.',
    highlightedPhrase: 'Autonomy + Accountability + Blockchain Enforcement',
  },
  {
    id: 9,
    key: 'scene9',
    title: 'Closing: Programmable Trust Infrastructure',
    duration: 33.03,
    audioSrc: '/audio/scene9.wav',
    narration:
      'As AI becomes a participant in commerce, trust cannot depend only on who is operating the system. The transaction itself needs an accountable record of what was agreed, what happened, how it was verified, and how it was resolved. That is VeriqoMesh Network. AI executes. Humans adjudicate. Blockchain enforces. Define the deal. Protect the transaction. Verify the outcome.',
    caption:
      'VERIQOMESH NETWORK: Define the deal. Protect the transaction. Verify the outcome.',
    highlightedPhrase: 'AI executes. Humans adjudicate. Blockchain enforces.',
  },
];

export default function DemoVideoStudioPage() {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // within scene
  const [totalElapsed, setTotalElapsed] = useState(0); // overall
  const [audioMuted, setAudioMuted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentScene = SCENES[currentSceneIndex];
  const totalDuration = SCENES.reduce((sum, s) => sum + s.duration, 0);

  // Compute total elapsed time up to current scene
  const elapsedBeforeCurrentScene = SCENES.slice(0, currentSceneIndex).reduce(
    (sum, s) => sum + s.duration,
    0
  );

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (audioRef.current) audioRef.current.pause();
    } else {
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentSceneIndex(0);
    setCurrentTime(0);
    setTotalElapsed(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = SCENES[0].audioSrc;
    }
  };

  const jumpToScene = (index: number) => {
    setCurrentSceneIndex(index);
    setCurrentTime(0);
    const newTotal = SCENES.slice(0, index).reduce((sum, s) => sum + s.duration, 0);
    setTotalElapsed(newTotal);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = SCENES[index].audioSrc;
      audioRef.current.currentTime = 0;
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      }
    }
  };

  // Sync scene progression
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = currentScene.audioSrc;
      audioRef.current.currentTime = 0;
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [currentSceneIndex]);

  // Audio time update handler
  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      const t = audioRef.current.currentTime;
      setCurrentTime(t);
      setTotalElapsed(elapsedBeforeCurrentScene + t);
    }
  };

  // Audio ended handler -> advance scene
  const handleAudioEnded = () => {
    if (currentSceneIndex < SCENES.length - 1) {
      setCurrentSceneIndex((prev) => prev + 1);
      setCurrentTime(0);
    } else {
      setIsPlaying(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#02040a] text-gray-100 font-sans p-4 md:p-6 flex flex-col justify-between">
      {/* Hidden audio element for synchronous playback */}
      <audio
        ref={audioRef}
        src={currentScene.audioSrc}
        muted={audioMuted}
        onTimeUpdate={handleAudioTimeUpdate}
        onEnded={handleAudioEnded}
      />

      {/* Top Header / Studio Bar */}
      <header className="max-w-6xl mx-auto w-full mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="px-2.5 py-1 text-xs font-mono rounded bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-700 transition"
          >
            ← Back to Web App
          </Link>
          <div>
            <h1 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
              VERIQOMESH NETWORK — HACKATHON VIDEO DEMO STUDIO
            </h1>
            <p className="text-[11px] text-gray-400">
              1080p 16:9 Production Master • Target: ~04:15 • Audio: SAPI Synthesis
            </p>
          </div>
        </div>

        {/* Studio Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePlayPause}
            className={`px-4 py-1.5 rounded text-xs font-mono font-bold transition shadow ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isPlaying ? '❚❚ Pause Presentation' : '▶ Play Full Video (04:15)'}
          </button>
          <button
            onClick={handleReset}
            className="px-2.5 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-mono transition"
          >
            Reset
          </button>
          <button
            onClick={() => setAudioMuted(!audioMuted)}
            className="px-2.5 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-mono transition"
          >
            {audioMuted ? '🔇 Unmute' : '🔊 Narration On'}
          </button>
        </div>
      </header>

      {/* Main 16:9 Video Canvas / Stage Viewport */}
      <main className="max-w-6xl mx-auto w-full flex-1 flex flex-col justify-center my-2">
        <div className="relative w-full aspect-video bg-[#030712] rounded-xl border border-gray-800 overflow-hidden shadow-2xl flex flex-col justify-between p-6 md:p-8">
          {/* Persistent Top Badges */}
          <div className="flex items-center justify-between text-xs font-mono z-20">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-purple-950 border border-purple-700 text-purple-300 font-bold text-[10px]">
                VERIQOMESH NETWORK
              </span>
              <span className="text-gray-400 text-[11px] hidden sm:inline">
                Trusted Commerce for Humans & AI
              </span>
            </div>

            <div>
              {currentScene.id === 3 && (
                <span className="px-2.5 py-0.5 rounded bg-emerald-950 border border-emerald-600 text-emerald-300 font-bold text-[10px]">
                  SIMULATED AUTONOMOUS AGENT DEMO
                </span>
              )}
              {(currentScene.id === 5 || currentScene.id === 6 || currentScene.id === 7) && (
                <span className="px-2.5 py-0.5 rounded bg-blue-950 border border-blue-600 text-blue-300 font-bold text-[10px]">
                  LIVE MONAD TESTNET RECORD (Chain 10143)
                </span>
              )}
              {(currentScene.id === 1 || currentScene.id === 2 || currentScene.id === 4 || currentScene.id === 8 || currentScene.id === 9) && (
                <span className="px-2.5 py-0.5 rounded bg-gray-900 border border-gray-700 text-gray-300 font-bold text-[10px]">
                  SYSTEM ARCHITECTURE
                </span>
              )}
            </div>
          </div>

          {/* Central Visual Content Area (Switched per scene) */}
          <div className="flex-1 flex flex-col justify-center items-center my-auto z-10 w-full max-w-4xl mx-auto">
            {/* SCENE 1: HOOK & INFRASTRUCTURE */}
            {currentScene.id === 1 && (
              <div className="text-center space-y-4 animate-fadeIn">
                <div className="inline-block px-3 py-1 rounded-full bg-purple-950/80 border border-purple-600/70 text-purple-300 font-mono text-xs font-semibold uppercase tracking-widest">
                  Programmable Trust Infrastructure
                </div>
                <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
                  VERIQOMESH NETWORK
                </h2>
                <p className="text-purple-300 font-mono text-sm md:text-lg font-bold">
                  AI executes. Humans adjudicate. Blockchain enforces.
                </p>

                {/* Animated Visual Architecture Diagram */}
                <div className="pt-2 pb-1">
                  <div className="p-4 bg-gray-950/80 border border-gray-800 rounded-xl font-mono text-xs text-gray-300 max-w-2xl mx-auto space-y-2">
                    <div className="flex justify-center items-center gap-3 text-white font-semibold">
                      <span className="px-2 py-1 bg-gray-900 rounded border border-gray-700">Human</span>
                      <span>•</span>
                      <span className="px-2 py-1 bg-gray-900 rounded border border-gray-700">Business</span>
                      <span>•</span>
                      <span className="px-2 py-1 bg-purple-950 border border-purple-700 text-purple-300">AI Agent</span>
                    </div>
                    <div className="text-purple-400 text-center font-bold">↓ Agreement (Terms & Verification Spec)</div>
                    <div className="p-2 bg-purple-950/40 rounded border border-purple-600 text-white font-bold text-center">
                      Protected Transaction (Non-Custodial Escrow Vault)
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-1 text-center">
                      <div className="p-2 bg-emerald-950/40 rounded border border-emerald-700">
                        <div className="text-emerald-300 font-bold">VERIFIED (PASS)</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">Autonomous Agent Release</div>
                      </div>
                      <div className="p-2 bg-amber-950/40 rounded border border-amber-700">
                        <div className="text-amber-300 font-bold">CONTESTED (INCONCLUSIVE)</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">AI Evidence → 3 Human Judges → Consensus</div>
                      </div>
                    </div>
                    <div className="text-center text-emerald-400 font-bold pt-1">
                      ↓ Onchain Settlement & Non-Transferable Trust Receipt
                    </div>
                  </div>
                </div>

                <div className="text-xs font-mono text-gray-400 tracking-wider">
                  &ldquo;Define the deal. Protect the transaction. Verify the outcome.&rdquo;
                </div>
              </div>
            )}

            {/* SCENE 2: THE DUAL-TRACK MODEL */}
            {currentScene.id === 2 && (
              <div className="w-full space-y-4 animate-fadeIn">
                <div className="text-center mb-2">
                  <h3 className="text-xl font-bold text-white font-mono uppercase tracking-wider">
                    The Dual-Track Architecture Model
                  </h3>
                  <p className="text-xs text-purple-300 font-sans mt-0.5">
                    Human intervention is not required for every transaction.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Track 1: Normal Autonomous */}
                  <div className="p-4 rounded-xl bg-purple-950/20 border border-emerald-600/60 space-y-2">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-1.5">
                      <span className="font-mono text-xs font-bold text-emerald-300">
                        1. NORMAL AUTONOMOUS PATH
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 text-[10px] font-mono">
                        Zero Human Delays
                      </span>
                    </div>
                    <div className="text-xs font-mono text-gray-300 space-y-1">
                      <div>• Authorized AI Agent creates agreement</div>
                      <div>• Funds escrow within policy limit (50 MON)</div>
                      <div>• Evidence anchored onchain</div>
                      <div>• Independent verifier attests PASS</div>
                      <div className="text-emerald-400 font-bold">
                        • Authorized agent executes releaseEscrow() autonomously
                      </div>
                      <div className="text-purple-300 font-semibold">• Trust Receipt issued</div>
                    </div>
                  </div>

                  {/* Track 2: Contested Escalation */}
                  <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-600/60 space-y-2">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-1.5">
                      <span className="font-mono text-xs font-bold text-amber-300">
                        2. CONTESTED ADJUDICATION ESCALATION
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-700 text-amber-300 text-[10px] font-mono">
                        Structured Human Quorum
                      </span>
                    </div>
                    <div className="text-xs font-mono text-gray-300 space-y-1">
                      <div>• Verification returns INCONCLUSIVE</div>
                      <div>• Escrow locks funds onchain (circuits protected)</div>
                      <div>• AI compiles advisory evidence dossier</div>
                      <div>• 3 independent human judges submit signed ballots</div>
                      <div className="text-amber-400 font-bold">
                        • Median consensus unlocks settlement gate
                      </div>
                      <div className="text-purple-300 font-semibold">• Onchain resolver dispatches settlement</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SCENE 3: DEMO A: AUTONOMOUS AI AGENT */}
            {currentScene.id === 3 && (
              <div className="w-full space-y-3 font-mono text-xs animate-fadeIn">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <span className="text-sm font-bold text-purple-300">
                    DEMO A: AUTONOMOUS AGENT PROCUREMENT (SIMULATED MODEL)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-600 text-emerald-300 text-[10px]">
                    POLICY AUTHORIZED
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 bg-gray-950 rounded border border-gray-800">
                    <span className="text-gray-500 block text-[10px]">AGENT GOVERNANCE:</span>
                    <span className="text-white font-bold">Limit: 50.0 MON / Tx</span>
                    <span className="text-emerald-400 block text-[10px]">Auto-Sign: ACTIVE</span>
                  </div>
                  <div className="p-2.5 bg-gray-950 rounded border border-gray-800">
                    <span className="text-gray-500 block text-[10px]">PROTECTED ESCROW:</span>
                    <span className="text-white font-bold">20.0 MON Locked</span>
                    <span className="text-gray-400 block text-[10px]">Non-Custodial Vault</span>
                  </div>
                  <div className="p-2.5 bg-gray-950 rounded border border-gray-800">
                    <span className="text-gray-500 block text-[10px]">VERIFICATION RESULT:</span>
                    <span className="text-emerald-400 font-bold text-sm">PASS (100/100 OK)</span>
                    <span className="text-gray-400 block text-[10px]">Independent Depot Audit</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-950/30 rounded border border-emerald-700/60 space-y-1.5">
                  <div className="text-emerald-300 font-bold flex items-center gap-1.5">
                    <span>✓</span> Verification PASS Unlocks Settlement Path
                  </div>
                  <p className="text-[11px] text-gray-300 font-sans">
                    Under the buyer agent&apos;s pre-approved mandate, the authorized agent executes{' '}
                    <code className="text-purple-300">releaseEscrow()</code> autonomously with zero human delays.
                  </p>
                  <div className="p-2 bg-gray-950 rounded border border-gray-800 text-[10px] flex justify-between items-center text-gray-300">
                    <span>OUTPUT: Trust Receipt Record #1 (Simulated Demo)</span>
                    <span className="text-emerald-400 font-bold">100% Payout to Seller</span>
                  </div>
                </div>
              </div>
            )}

            {/* SCENE 4: WHY CONTESTED TRANSACTIONS ARE DIFFERENT */}
            {currentScene.id === 4 && (
              <div className="text-center space-y-5 animate-fadeIn">
                <div className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
                  The Critical Problem in Autonomous Commerce
                </div>
                <h3 className="text-2xl md:text-4xl font-extrabold text-white">
                  What Happens When Evidence Is Inconclusive?
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto font-mono text-xs">
                  <div className="p-4 bg-gray-950 rounded-xl border border-gray-800">
                    <div className="text-gray-400 mb-1">WHEN EVIDENCE IS CLEAR</div>
                    <div className="text-lg font-bold text-emerald-400">AUTONOMY</div>
                    <div className="text-[10px] text-gray-500 mt-1">AI agent executes directly</div>
                  </div>
                  <div className="p-4 bg-amber-950/30 rounded-xl border border-amber-600">
                    <div className="text-amber-300 mb-1">WHEN EVIDENCE IS CONTESTED</div>
                    <div className="text-lg font-bold text-amber-300">ADJUDICATION</div>
                    <div className="text-[10px] text-gray-400 mt-1">Escrow locks; human panel decides</div>
                  </div>
                </div>
                <p className="text-xs text-gray-300 max-w-lg mx-auto font-sans leading-relaxed">
                  VeriqoMesh does NOT give AI unilateral financial authority to settle disputes. The smart contract halts autonomous release and escalates to structured human adjudication.
                </p>
              </div>
            )}

            {/* SCENE 5: DEMO B: LIVE MONAD TESTNET RECORD */}
            {currentScene.id === 5 && (
              <div className="w-full space-y-3 font-mono text-xs animate-fadeIn">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <span className="text-sm font-bold text-amber-300">
                    DEMO B: CANONICAL MONAD TESTNET DISPUTE RECORD
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-950 border border-blue-600 text-blue-300 text-[10px]">
                    Chain ID: 10143
                  </span>
                </div>

                <div className="p-2.5 bg-gray-950 rounded border border-gray-800 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">CANONICAL TX HASH:</span>
                    <span className="text-purple-300">0x2b57d6b0ef1ba16a60c4f801d90d27d23e598fd6b1381e0175077201dc6afcc4</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">ESCROW CONTRACT:</span>
                    <span className="text-gray-300">0x925ea880cA53DE0352b84B24d0C0dee5b258015A</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">VERIFICATION OUTCOME:</span>
                    <span className="text-amber-400 font-bold">⚠ INCONCLUSIVE (85 OK, 15 damaged in transit)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">ESCROW STATUS:</span>
                    <span className="text-red-400 font-bold">LOCKED IN VAULT LIABILITIES (0.001 MON)</span>
                  </div>
                </div>

                <div className="p-3 bg-purple-950/30 rounded border border-purple-700/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-300 font-bold text-xs">AI Evidence Dossier</span>
                    <div className="flex gap-1.5">
                      <span className="text-[9px] px-1.5 py-0.5 bg-amber-950 text-amber-300 rounded border border-amber-800 font-bold">
                        AI ANALYZED -- HUMAN REVIEW REQUIRED
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-red-950 text-red-300 rounded border border-red-800 font-bold">
                        ZERO FINANCIAL OR VOTING AUTHORITY
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-300 font-sans leading-relaxed">
                    AI synthesizes telemetry, Bill of Lading, and sensor anomaly logs into an advisory dossier for human adjudicators. It cannot vote or release funds.
                  </p>
                </div>
              </div>
            )}

            {/* SCENE 6: HUMAN JUDGES & DETERMINISTIC CONSENSUS */}
            {currentScene.id === 6 && (
              <div className="w-full space-y-3 font-mono text-xs animate-fadeIn">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <span className="text-sm font-bold text-purple-300">
                    STAGE 4: STRUCTURED 3-JUDGE HUMAN ADJUDICATION
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-600 text-emerald-300 text-[10px]">
                    3/3 Conflict Cleared
                  </span>
                </div>

                {/* 3 Judges & Signed Ballots */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 bg-gray-950 rounded border border-gray-800 text-center">
                    <div className="text-[10px] text-gray-500">JUDGE 1</div>
                    <div className="text-purple-300 text-[10px] truncate">0x76B9...b853</div>
                    <div className="text-sm font-bold text-white mt-1">1000 BPS</div>
                    <div className="text-[9px] text-gray-400">10% Refund to Buyer</div>
                  </div>
                  <div className="p-2.5 bg-purple-950/50 rounded border border-purple-500 text-center">
                    <div className="text-[10px] text-purple-300 font-bold">JUDGE 2 (MEDIAN)</div>
                    <div className="text-purple-300 text-[10px] truncate">0x41CE...4439</div>
                    <div className="text-base font-extrabold text-white mt-1">1500 BPS</div>
                    <div className="text-[9px] text-emerald-300">15% Refund to Buyer</div>
                  </div>
                  <div className="p-2.5 bg-gray-950 rounded border border-gray-800 text-center">
                    <div className="text-[10px] text-gray-500">JUDGE 3</div>
                    <div className="text-purple-300 text-[10px] truncate">0x3EAf...c82a</div>
                    <div className="text-sm font-bold text-white mt-1">2000 BPS</div>
                    <div className="text-[9px] text-gray-400">20% Refund to Buyer</div>
                  </div>
                </div>

                {/* Consensus Calculation Card */}
                <div className="p-3 bg-gray-950 rounded border border-gray-800 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-gray-500 block text-[10px]">3-JUDGE MEDIAN CONSENSUS:</span>
                    <span className="text-white font-bold text-sm">1500 BPS (85% Seller / 15% Buyer)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-500 block text-[10px]">SPREAD CALCULATION:</span>
                    <span className="text-emerald-400 font-bold">1000 BPS &le; 4000 BPS Threshold</span>
                    <span className="text-[10px] text-emerald-300 block font-bold">STATUS: NON-POLARIZED</span>
                  </div>
                </div>
              </div>
            )}

            {/* SCENE 7: SETTLEMENT AUTHORIZATION GATE + BLOCKCHAIN PROOF */}
            {currentScene.id === 7 && (
              <div className="w-full space-y-3 font-mono text-xs animate-fadeIn">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <span className="text-sm font-bold text-purple-300">
                    SETTLEMENT AUTHORIZATION GATE & BLOCKCHAIN SETTLEMENT
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-600 text-emerald-300 text-[10px]">
                    GATE PASSED
                  </span>
                </div>

                <div className="p-2.5 bg-gray-950 rounded border border-gray-800 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">QUORUM ATTESTATION:</span>
                    <span className="text-emerald-400 font-bold">3/3 Valid Independent Signed Ballots</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">ACTIVE DISPATCH RESOLVER:</span>
                    <span className="text-purple-300">0x12f9e53c31F7629aCAE0BA70588794945EC6c35E</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">CONFIRMED SETTLEMENT TX:</span>
                    <span className="text-purple-300 font-bold">0x91ff62584f4386250ccb09f28808453bb373273d9fa5f56cf04378c2a78084ba</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">TERMINAL OUTCOME:</span>
                    <span className="text-emerald-400 font-bold">STATE 11 -- SETTLED</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-950/30 rounded border border-emerald-700/60 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-300 font-bold">VeriqoMesh Trust Receipt #2</span>
                    <span className="text-[10px] text-gray-400">Non-Transferable Accountability Record</span>
                  </div>
                  <div className="text-[11px] text-gray-300">
                    Split Payout: 0.00085 MON to Seller (85%) / 0.00015 MON to Buyer (15%). Solvency invariant preserved.
                  </div>
                </div>
              </div>
            )}

            {/* SCENE 8: THE ARCHITECTURE IN ONE VIEW */}
            {currentScene.id === 8 && (
              <div className="w-full space-y-3 font-mono text-xs animate-fadeIn">
                <div className="text-center mb-1">
                  <h3 className="text-lg font-bold text-white font-mono uppercase">
                    The Complete VeriqoMesh Architecture
                  </h3>
                  <p className="text-[11px] text-purple-300">
                    Autonomy for clear transactions. Accountability for contested outcomes.
                  </p>
                </div>

                <div className="p-4 bg-gray-950 rounded-xl border border-gray-800 space-y-3">
                  <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-[11px] border-b border-gray-800 pb-1.5">
                    <span>NORMAL:</span>
                    <span className="text-white">AI Agent</span> → <span className="text-purple-300">Policy</span> → <span className="text-white">Escrow</span> → <span className="text-blue-300">Evidence</span> → <span className="text-emerald-300">PASS</span> → <span className="text-emerald-400">Autonomous Release</span> → <span className="text-purple-300">Trust Receipt</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[11px]">
                    <span>CONTESTED:</span>
                    <span className="text-amber-400">INCONCLUSIVE</span> → <span className="text-red-400">Escrow Locked</span> → <span className="text-purple-300">AI Dossier</span> → <span className="text-white">3 Human Judges</span> → <span className="text-emerald-400">Consensus</span> → <span className="text-purple-300">Onchain Settlement</span> → <span className="text-purple-300">Trust Receipt</span>
                  </div>
                </div>

                <div className="text-center text-gray-400 font-sans text-xs">
                  Deterministic blockchain enforcement guarantees solvency and payout invariants at the smart contract level.
                </div>
              </div>
            )}

            {/* SCENE 9: FINAL CLOSE */}
            {currentScene.id === 9 && (
              <div className="text-center space-y-4 animate-fadeIn">
                <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
                  VERIQOMESH NETWORK
                </h2>
                <div className="text-purple-300 font-mono text-base md:text-xl font-bold">
                  AI executes. Humans adjudicate. Blockchain enforces.
                </div>
                <div className="py-2">
                  <div className="inline-block px-4 py-2 rounded-lg bg-gray-950 border border-gray-800 text-xs md:text-sm font-mono text-gray-300 tracking-wider">
                    DEFINE THE DEAL. PROTECT THE TRANSACTION. VERIFY THE OUTCOME.
                  </div>
                </div>
                <p className="text-xs text-gray-500 font-mono">
                  Monad Metropolis Testnet • Chain ID: 10143
                </p>
              </div>
            )}
          </div>

          {/* Subtitles & Burned-In Captions Bar (Bottom of Video Frame) */}
          <div className="w-full z-20">
            <div className="p-3 rounded-lg bg-black/90 border border-gray-800/80 text-center backdrop-blur shadow-lg">
              <p className="text-xs md:text-sm text-gray-100 font-sans leading-relaxed">
                {currentScene.caption}
              </p>
              {currentScene.highlightedPhrase && (
                <div className="text-[11px] font-mono font-bold text-amber-300 mt-1">
                  &ldquo;{currentScene.highlightedPhrase}&rdquo;
                </div>
              )}
            </div>

            {/* Timeline & Progress Bar */}
            <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-gray-400 gap-2">
              <span>
                Scene {currentScene.id}/9: {currentScene.title}
              </span>
              <div className="flex-1 mx-2 h-1 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${(totalElapsed / totalDuration) * 100}%` }}
                />
              </div>
              <span>
                {formatTime(totalElapsed)} / {formatTime(totalDuration)}
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Scene Jumper Tray */}
      <footer className="max-w-6xl mx-auto w-full mt-3 pt-3 border-t border-gray-800">
        <div className="flex items-center justify-between mb-1.5 text-xs font-mono text-gray-400">
          <span>Scene Jumper & QA Reviewer</span>
          <span>{SCENES.length} Scenes Mastered</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5">
          {SCENES.map((scene, idx) => (
            <button
              key={scene.id}
              onClick={() => jumpToScene(idx)}
              className={`p-1.5 rounded text-left transition text-[10px] font-mono truncate border ${
                idx === currentSceneIndex
                  ? 'bg-purple-950 border-purple-500 text-white font-bold shadow'
                  : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              <div className="opacity-70">Scene {scene.id}</div>
              <div className="truncate font-semibold">{scene.key}</div>
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
}
