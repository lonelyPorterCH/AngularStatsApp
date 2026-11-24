[CmdletBinding()]
param(
    [string]$RemoteHost = 'fabio@192.168.0.23',
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'

if ($RemoteHost -notmatch '^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+$') {
    throw 'RemoteHost must be in the form user@hostname.'
}

$root = Split-Path -Parent $PSScriptRoot
$appHtml = Get-Content -Raw (Join-Path $root 'frontend\stats-app\src\app\app.html')
$backendBuild = Get-Content -Raw (Join-Path $root 'backend\build.gradle')
$frontendVersion = [regex]::Match($appHtml, '<span class="version">v(\d+\.\d+\.\d+)</span>')
$backendVersion = [regex]::Match($backendBuild, "(?m)^\s*version\s*=\s*'(\d+\.\d+\.\d+)-SNAPSHOT'\s*$")

if (-not $frontendVersion.Success -or -not $backendVersion.Success -or
    $frontendVersion.Groups[1].Value -ne $backendVersion.Groups[1].Value) {
    throw 'Could not find matching frontend and backend versions.'
}

$version = $frontendVersion.Groups[1].Value
$archiveName = "statsapp-angular-$version.tar"
$archive = Join-Path $root $archiveName
$remoteDirectory = '/volume1/docker/images/statsapp-deploy'

function Invoke-Checked {
    param([string]$Program, [string[]]$Arguments)

    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Program failed with exit code $LASTEXITCODE."
    }
}

if ($SkipBuild) {
    if (-not (Test-Path -LiteralPath $archive -PathType Leaf) -or
        (Get-Item -LiteralPath $archive).Length -eq 0) {
        throw "Cannot reuse missing or empty archive $archiveName."
    }
    Write-Host "Reusing $archiveName without rebuilding."
} else {
    if (Test-Path -LiteralPath $archive) {
        if ((Read-Host "Replace existing archive $archiveName? Type YES") -cne 'YES') {
            throw 'Deployment cancelled without replacing the archive.'
        }
    }

    Write-Host "Building StatsApp $version..."
    Invoke-Checked docker @('build', '--platform', 'linux/amd64', '-t', 'statsapp:latest', $root)
    Invoke-Checked docker @('save', 'statsapp:latest', '-o', $archive)
}

Write-Host 'Uploading image and deployment files. SSH may ask for your password.'
Invoke-Checked ssh @($RemoteHost, "mkdir -p $remoteDirectory && chmod 700 $remoteDirectory")
Invoke-Checked scp @('-O', $archive, "${RemoteHost}:/volume1/docker/images/$archiveName")
Invoke-Checked scp @(
    '-O',
    (Join-Path $PSScriptRoot 'compose.yaml'),
    (Join-Path $PSScriptRoot 'remote-deploy.sh'),
    "${RemoteHost}:$remoteDirectory/"
)

Write-Host 'Starting the interactive NAS deployment. sudo may ask for your password.'
Invoke-Checked ssh @('-tt', $RemoteHost, "sudo sh $remoteDirectory/remote-deploy.sh /volume1/docker/images/$archiveName")
