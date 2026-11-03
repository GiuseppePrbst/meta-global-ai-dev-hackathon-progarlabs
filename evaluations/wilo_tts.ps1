# Synthetic Spanish test audio with local Windows voices (System.Speech), 16 kHz mono PCM16.
# Output goes to a private folder; the phrases are synthetic and contain no personal data.
param(
    [string]$Phrases = "evaluations/wilo_asr_phrases.json",
    [string]$Output = "D:/data/bosque-vivo/wilo-asr/audio"
)
Add-Type -AssemblyName System.Speech
$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$items = (Get-Content $Phrases -Raw -Encoding UTF8 | ConvertFrom-Json).phrases
New-Item -ItemType Directory -Force $Output | Out-Null
foreach ($voice in @("Microsoft Helena Desktop", "Microsoft Sabina Desktop")) {
    $tag = ($voice -split " ")[1].ToLower()
    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
    $synth.SelectVoice($voice)
    foreach ($p in $items) {
        $path = Join-Path $Output ("{0}-{1}.wav" -f $p.id, $tag)
        $synth.SetOutputToWaveFile($path, $format)
        $synth.Speak($p.text)
        $synth.SetOutputToNull()
    }
    $synth.Dispose()
}
Get-ChildItem $Output -Filter *.wav | Measure-Object | Select-Object -ExpandProperty Count
