# VeriqoMesh Network -- Hackathon Demo Video Assembly Script
# Generates or assembles veriqomesh-network-hackathon-demo.mp4 (1080p, 16:9, H.264)

$root = if ($PSScriptRoot) { Split-Path -Parent $PSScriptRoot } else { (Get-Location).Path }
$audioDir = Join-Path $root "apps\web\public\audio"
$srtPath = Join-Path $root "veriqomesh-network-hackathon-demo-subtitles.srt"
$scriptPath = Join-Path $root "veriqomesh-network-hackathon-demo-script.txt"
$outMp4 = Join-Path $root "veriqomesh-network-hackathon-demo.mp4"

Write-Output "================================================================================"
Write-Output "VERIQOMESH NETWORK -- HACKATHON DEMO VIDEO PRODUCTION & ASSEMBLY"
Write-Output "================================================================================"

# 1. Check Artifacts
Write-Output "[1/4] Checking Production Artifacts..."
if (!(Test-Path $srtPath)) {
    Write-Error "SRT file not found at $srtPath"
    exit 1
}
Write-Output "  [OK] Subtitles found: $srtPath"

if (!(Test-Path $scriptPath)) {
    Write-Error "Script file not found at $scriptPath"
    exit 1
}
Write-Output "  [OK] Production script found: $scriptPath"

# 2. Check Scene Audio Tracks
Write-Output "[2/4] Checking Scene Narration Audio Files (SAPI Synthesis)..."
for ($i = 1; $i -le 9; $i++) {
    $wav = Join-Path $audioDir "scene$i.wav"
    if (Test-Path $wav) {
        $sz = (Get-Item $wav).Length
        Write-Output "  [OK] Scene $i audio: scene$i.wav ($sz bytes)"
    } else {
        Write-Error "Missing audio: scene$i.wav"
        exit 1
    }
}

# 3. Check FFmpeg availability
Write-Output "[3/4] Checking FFmpeg Encoder..."

# Check PATH or local installation directories
if (!(Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    $candidates = @(
        "$root\ffmpeg.exe",
        "$root\tools\ffmpeg.exe",
        "$env:USERPROFILE\.ffmpeg\node_modules\@ffmpeg-installer\win32-x64\ffmpeg.exe",
        "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-*\bin\ffmpeg.exe",
        "$env:LOCALAPPDATA\Microsoft\WinGet\Links\ffmpeg.exe"
    )
    foreach ($cand in $candidates) {
        $resolved = Resolve-Path $cand -ErrorAction SilentlyContinue
        if ($resolved) {
            $binDir = Split-Path $resolved[0].Path -Parent
            $env:PATH = "$binDir;$env:PATH"
            break
        }
    }
}

$ffmpegCmd = Get-Command ffmpeg -ErrorAction SilentlyContinue

if ($ffmpegCmd) {
    Write-Output "  [OK] FFmpeg found: $($ffmpegCmd.Source)"
    Write-Output "[4/4] Rendering 1080p master video..."
    
    # Create audio concat list
    $concatList = Join-Path $root "scripts\concat_audio.txt"
    $concatContent = @()
    for ($i = 1; $i -le 9; $i++) {
        $w = (Join-Path $audioDir "scene$i.wav").Replace("\", "/")
        $concatContent += "file '$w'"
    }
    Set-Content -Path $concatList -Value $concatContent -Encoding ASCII
    
    # Build subtitle path with escaped colon and forward slashes for ffmpeg filter
    $subFilter = "subtitles=veriqomesh-network-hackathon-demo-subtitles.srt"
    
    # Run FFmpeg to encode 1080p video with concatenated audio and subtitles
    & ffmpeg -y -f concat -safe 0 -i $concatList -f lavfi -i color=c=0x030712:s=1920x1080:r=30 -vf $subFilter -c:v libx264 -pix_fmt yuv420p -preset fast -c:a aac -b:a 192k -shortest $outMp4
    
    # Cleanup temporary concat list
    if (Test-Path $concatList) { Remove-Item $concatList -Force }
    
    if (Test-Path $outMp4) {
        $mp4Item = Get-Item $outMp4
        Write-Output "  [OK] Video created successfully: $($mp4Item.FullName) ($($mp4Item.Length) bytes)"
    } else {
        Write-Error "FFmpeg finished but output MP4 was not found at $outMp4"
    }
} else {
    Write-Output "  [INFO] FFmpeg is not installed in the local system PATH."
    Write-Output ""
    Write-Output "To watch the complete synchronized 1080p presentation video with narration and live UI:"
    Write-Output "  1. Start the web application: npm run dev -w @trustmesh/web"
    Write-Output "  2. Open http://localhost:3000/demo-video in any modern browser (Edge / Chrome)"
    Write-Output "  3. Click Play Full Video (04:15) for the full automated director cut"
    Write-Output ""
    Write-Output "To render MP4 when FFmpeg is installed:"
    Write-Output "  ffmpeg -f lavfi -i color=c=0x030712:s=1920x1080:d=255.68 -vf subtitles=veriqomesh-network-hackathon-demo-subtitles.srt -c:v libx264 -pix_fmt yuv420p veriqomesh-network-hackathon-demo.mp4"
}

Write-Output "================================================================================"
Write-Output "ASSEMBLY SCRIPT COMPLETE"
Write-Output "================================================================================"
