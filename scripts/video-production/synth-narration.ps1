Add-Type -AssemblyName System.Speech

$shots = @(
    @{ id = "shot01"; text = "AI is becoming capable of participating in commerce. But should an AI be allowed to control the money?"; targetSec = 8 },
    @{ id = "shot02"; text = "VeriqoMesh is a programmable trust layer for human and AI-assisted commerce on Monad."; targetSec = 7 },
    @{ id = "shot03"; text = "Our architecture separates intelligence from financial authority."; targetSec = 13 },
    @{ id = "shot04"; text = "A buyer starts with a natural-language commercial need."; targetSec = 6 },
    @{ id = "shot05"; text = "VeriqoMesh turns that intent into explicit agreement parameters: what is being purchased, how much it costs, who receives it, who verifies it, and what evidence is required."; targetSec = 15 },
    @{ id = "shot06"; text = "The agreement is deterministically represented and cryptographically committed before the transaction proceeds."; targetSec = 10 },
    @{ id = "shot07"; text = "The receiver reviews the same agreement through their wallet identity and explicitly participates in authorization."; targetSec = 13 },
    @{ id = "shot08"; text = "Once authorized, the agreement can move into the escrow-backed transaction lifecycle."; targetSec = 12 },
    @{ id = "shot09"; text = "After execution, evidence is anchored through a cryptographic commitment, while sensitive raw evidence remains offchain."; targetSec = 12 },
    @{ id = "shot10"; text = "A designated verifier evaluates the evidence and produces an explicit verification outcome."; targetSec = 11 },
    @{ id = "shot11"; text = "The transaction state is independently indexed and auditable, with the blockchain remaining authoritative for financial state."; targetSec = 12 },
    @{ id = "shot12"; text = "After the required verification and authorization conditions are satisfied, the transaction reaches onchain settlement."; targetSec = 12 },
    @{ id = "shot13"; text = "The completed transaction produces a Trust Receipt linking the agreement, evidence, verification outcome, and settlement into a durable onchain record."; targetSec = 25 },
    @{ id = "shot14"; text = "The result is a commerce workflow where AI can assist without becoming the unrestricted authority over money."; targetSec = 12 },
    @{ id = "shot15"; text = "VeriqoMesh. Trust. Verify. Transact."; targetSec = 13 }
)

$outDir = "scripts\video-production\audio"
if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force }

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice("Microsoft David Desktop")
$synth.Rate = 0 # Normal, clear cadence

Write-Output "Synthesizing 15 Narration Audio Tracks..."
$totalAudioDuration = 0

foreach ($s in $shots) {
    $wavPath = Join-Path $outDir "$($s.id).wav"
    $synth.SetOutputToWaveFile($wavPath)
    $synth.Speak($s.text)
    $synth.SetOutputToNull()
    
    # Measure duration with ffprobe / ffmpeg
    $ffOut = & ffmpeg -i $wavPath 2>&1 | Select-String "Duration:"
    $durStr = ""
    if ($ffOut -match "Duration:\s*(\d+):(\d+):(\d+\.\d+)") {
        $hrs = [double]$matches[1]
        $mins = [double]$matches[2]
        $secs = [double]$matches[3]
        $durSec = ($hrs * 3600) + ($mins * 60) + $secs
        $totalAudioDuration += $durSec
        $durStr = "$([math]::Round($durSec, 2))s"
    }
    Write-Output "  $($s.id): $durStr (target: $($s.targetSec)s) -> $($s.text.Substring(0, [math]::Min(50, $s.text.Length)))..."
}

$synth.Dispose()

Write-Output "`nTotal Voiceover Duration: $([math]::Round($totalAudioDuration, 2)) seconds"
Write-Output "Target Video Duration: 165 - 175 seconds"
