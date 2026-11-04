<#
Descarga los contratos ORIGINALES del repositorio de Bosque Vivo para Jose.
- No modifica el repositorio ni las aplicaciones.
- Descarga dos snapshots: main (codigo ya fusionado) y PR #42 (login federado pendiente).
- Los SHA estan anclados al corte del 04-11-2026; actualiza los refs solo tras validar GitHub.
- Requiere acceso HTTPS a raw.githubusercontent.com en el PC local.
#>
param([string]$Destino = (Join-Path $PSScriptRoot 'contratos_originales'))

$ErrorActionPreference = 'Stop'
$repository = 'GiuseppePrbst/meta-global-ai-dev-hackathon-progarlabs'
$main = '9e70ed22d90bdd0cd06d7ed8e1f5ef73ca580d4e'
$pr42 = '94e8bfedfefd9c494268afd3278ef65eeef1c069'
$files = @(
    @{ Ref=$main; Subdir='main'; Path='docs/FRONTEND_HANDOFF.md' },
    @{ Ref=$main; Subdir='main'; Path='docs/SESSION_AUTH_CONTRACT.md' },
    @{ Ref=$main; Subdir='main'; Path='docs/WILO_VOICE_API_HANDOFF.md' },
    @{ Ref=$main; Subdir='main'; Path='docs/API_INTEGRATION.md' },
    @{ Ref=$main; Subdir='main'; Path='docs/api/openapi.json' },
    @{ Ref=$pr42; Subdir='PR42'; Path='docs/FEDERATED_LOGIN.md' },
    @{ Ref=$pr42; Subdir='PR42'; Path='docs/FRONTEND_HANDOFF.md' },
    @{ Ref=$pr42; Subdir='PR42'; Path='docs/SESSION_AUTH_CONTRACT.md' },
    @{ Ref=$pr42; Subdir='PR42'; Path='docs/api/openapi.json' }
)
foreach ($file in $files) {
    $relative = $file.Path
    $url = "https://raw.githubusercontent.com/$repository/$($file.Ref)/$relative"
    $output = Join-Path (Join-Path $Destino $file.Subdir) $relative
    $parent = Split-Path $output -Parent
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
    Write-Host "Descargando $($file.Subdir)/$relative"
    Invoke-WebRequest -Uri $url -OutFile $output -ErrorAction Stop
    if ((Get-Item $output).Length -eq 0) { throw "Archivo vacio: $output" }
}
Write-Host "Contratos descargados en: $Destino"
Write-Host 'No usar el OpenAPI de PR42 como contrato de produccion hasta que el PR este desplegado.'
