# 새 PC에서 한 번만 실행하면 되는 설치 스크립트
#   사용법:  powershell -ExecutionPolicy Bypass -File .\setup.ps1
# 1) npm install 로 Electron 을 받고
# 2) Visual C++ 런타임이 없어서 Electron 압축 풀기가 실패하면, 직접 내려받아 풀어 넣어요
$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host 'Node.js 가 없어요. 먼저 설치해 주세요:  winget install OpenJS.NodeJS.LTS' -ForegroundColor Yellow
  exit 1
}

Write-Host '1/3 npm install ...' -ForegroundColor Cyan
& npm install --no-fund --no-audit
# Electron 다운로드 단계가 실패해도 계속 진행해요 (아래에서 직접 설치)

$electronDir = Join-Path $PSScriptRoot 'node_modules\electron'
$exe = Join-Path $electronDir 'dist\electron.exe'
if (Test-Path $exe) {
  Write-Host '2/3 Electron 이 이미 준비돼 있어요' -ForegroundColor Green
} else {
  $ver = (Get-Content (Join-Path $electronDir 'package.json') -Raw | ConvertFrom-Json).version
  $arch = if ([Environment]::Is64BitOperatingSystem) { 'x64' } else { 'ia32' }
  $zip = Join-Path $env:TEMP "electron-v$ver-win32-$arch.zip"
  $url = "https://github.com/electron/electron/releases/download/v$ver/electron-v$ver-win32-$arch.zip"
  Write-Host "2/3 Electron v$ver 직접 내려받는 중 (약 150MB) ..." -ForegroundColor Cyan
  if (-not (Test-Path $zip)) { $ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing }
  $dist = Join-Path $electronDir 'dist'
  if (Test-Path $dist) { Remove-Item -Recurse -Force $dist }
  Expand-Archive -Path $zip -DestinationPath $dist -Force
  Set-Content -Path (Join-Path $electronDir 'path.txt') -Value 'electron.exe' -NoNewline -Encoding ascii
}

Write-Host '3/3 확인 ...' -ForegroundColor Cyan
& npx electron --version
Write-Host '준비 완료! 실행:  npm start' -ForegroundColor Green
