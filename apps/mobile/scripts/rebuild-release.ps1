param(
    [string]$BuildRoot = 'C:\dev\brolly-exam-prep'
)
$ErrorActionPreference = 'Stop'
$sourceRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$nativeRoot = Join-Path $BuildRoot 'apps/mobile/android'
if (!(Test-Path -LiteralPath (Join-Path $nativeRoot 'gradlew.bat'))) {
    throw 'The prepared native Android build was not found.'
}
$backupRoot = Join-Path $BuildRoot ('release-backup-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $backupRoot | Out-Null
$releaseFiles = @(
    'apps/mobile/app.json',
    'apps/mobile/src/data/api/http.ts',
    'apps/mobile/src/app/(tabs)/tests.tsx',
    'apps/mobile/src/features/library/LibraryView.tsx'
)
foreach ($relative in $releaseFiles) {
    $target = Join-Path $BuildRoot $relative
    $backup = Join-Path $backupRoot $relative
    New-Item -ItemType Directory -Path (Split-Path $backup) -Force | Out-Null
    Copy-Item -LiteralPath $target -Destination $backup
    Copy-Item -LiteralPath (Join-Path $sourceRoot $relative) -Destination $target
}
$gradleFile = Join-Path $nativeRoot 'app/build.gradle'
Copy-Item -LiteralPath $gradleFile -Destination (Join-Path $backupRoot 'build.gradle')
$gradle = [IO.File]::ReadAllText($gradleFile)
if ($gradle -notmatch 'versionCode\s+\d+') { throw 'Native versionCode missing.' }
$versionCode = (Get-Content -Raw (Join-Path $sourceRoot 'apps/mobile/app.json') | ConvertFrom-Json).expo.android.versionCode
$gradle = $gradle -replace 'versionCode\s+\d+', "versionCode $versionCode"
[IO.File]::WriteAllText($gradleFile, $gradle, (New-Object Text.UTF8Encoding($false)))
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = 'C:\Users\HP\AppData\Local\Android\Sdk'
$env:EXPO_NO_DOTENV = '1'
$env:EXPO_PUBLIC_API_URL = 'https://mocktest.brollyexamprep.com/api'
$env:NODE_ENV = 'production'
Push-Location $nativeRoot
try {
    & .\gradlew.bat bundleRelease '-PreactNativeArchitectures=arm64-v8a,armeabi-v7a' --no-daemon
    if ($LASTEXITCODE -ne 0) { throw "Gradle failed: $LASTEXITCODE" }
} finally { Pop-Location }
$outputDir = Join-Path $sourceRoot 'artifacts'
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
$output = Join-Path $outputDir "TelanganaPolicePrep-v1.0.0-vc$versionCode.aab"
if (Test-Path -LiteralPath $output) { throw "Output already exists: $output" }
Copy-Item -LiteralPath (Join-Path $nativeRoot 'app/build/outputs/bundle/release/app-release.aab') -Destination $output
Write-Output "Bundle: $output"
Write-Output "Build source backup: $backupRoot"
