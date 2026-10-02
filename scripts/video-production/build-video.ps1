# Video Assembly Script for VeriqoMesh Network Hackathon Submission Video

$root = if ($PSScriptRoot) { Split-Path -Parent (Split-Path -Parent $PSScriptRoot) } else { (Get-Location).Path }
$framesDir = Join-Path $root "scripts\video-production\frames"
$audioDir = Join-Path $root "scripts\video-production\audio"
$segmentsDir = Join-Path $root "scripts\video-production\segments"
$outMp4 = Join-Path $root "veriqomesh-hackathon-submission.mp4"

if (!(Test-Path $segmentsDir)) { New-Item -ItemType Directory -Path $segmentsDir -Force }

$shotTimeline = @(
    @{ id = "shot01"; duration = 9.0 },
    @{ id = "shot02"; duration = 13.0 },
    @{ id = "shot03"; duration = 23.5 },
    @{ id = "shot04"; duration = 15.5 },
    @{ id = "shot05"; duration = 11.0 },
    @{ id = "shot06"; duration = 18.0 },
    @{ id = "shot07"; duration = 10.5 },
    @{ id = "shot08"; duration = 11.5 },
    @{ id = "shot09"; duration = 9.0 },
    @{ id = "shot10"; duration = 9.0 },
    @{ id = "shot11"; duration = 10.0 },
    @{ id = "shot12"; duration = 10.0 },
    @{ id = "shot13"; duration = 11.0 },
    @{ id = "shot14"; duration = 9.5 },
    @{ id = "shot15"; duration = 3.5 }
)

Write-Output "================================================================================"
Write-Output "BUILDING 1080P MASTER HACKATHON SUBMISSION VIDEO"
Write-Output "Target: 2:54 (174.0 seconds) • Resolution: 1920x1080 • Format: H.264 / AAC"
Write-Output "================================================================================"

$concatListPath = Join-Path $segmentsDir "concat_list.txt"
$concatEntries = @()

foreach ($s in $shotTimeline) {
    $img = Join-Path $framesDir "$($s.id).png"
    $wav = Join-Path $audioDir "$($s.id).wav"
    $segMp4 = Join-Path $segmentsDir "$($s.id).mp4"
    $dur = $s.duration

    Write-Output "Encoding $($s.id) (duration: $($dur)s)..."

    # Encode segment: pad audio with silence up to exact duration, loop 1080p frame
    & ffmpeg -y -loop 1 -framerate 30 -i $img -i $wav -c:v libx264 -tune stillimage -preset fast -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -ar 44100 -ac 2 -af "apad" -t $dur $segMp4 2>&1 | Out-Null

    if (!(Test-Path $segMp4)) {
        Write-Error "Failed to encode $segMp4"
        exit 1
    }

    $entry = "file '" + $segMp4.Replace("\", "/") + "'"
    $concatEntries += $entry
    Write-Output "  [OK] $($s.id).mp4 encoded successfully"
}

Set-Content -Path $concatListPath -Value $concatEntries -Encoding ASCII

Write-Output "`nConcatenating 15 Segments into Final Master Video..."
& ffmpeg -y -f concat -safe 0 -i $concatListPath -c copy $outMp4 2>&1 | Out-Null

if (Test-Path $outMp4) {
    $item = Get-Item $outMp4
    Write-Output "`n[SUCCESS] Final Video Created: $($item.FullName)"
    Write-Output "  Size: $([math]::Round($item.Length / 1MB, 2)) MB"

    # Verify duration & resolution
    $ffVerify = & ffmpeg -i $outMp4 2>&1
    Write-Output "Verification Stream Details:"
    $ffVerify | Select-String "Duration:|Stream #" | ForEach-Object { Write-Output "  $_" }
} else {
    Write-Error "Concatenation failed to produce $outMp4"
    exit 1
}
