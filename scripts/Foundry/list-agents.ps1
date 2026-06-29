<#
.SYNOPSIS
    Lists all Governance Council agents and their current configuration.
.EXAMPLE
    .\list-agents.ps1
    .\list-agents.ps1 -Verbose
#>
[CmdletBinding()]
param()

. $PSScriptRoot\..\gc-common.ps1

$headers = Get-FoundryHeaders

foreach ($name in $script:AllAgents) {
    try {
        $agent = Invoke-RestMethod -Uri "$script:Endpoint/agents/$name`?api-version=v1" -Headers $headers -Method Get
        $latest = $agent.versions.latest
        $def = $latest.definition
        $toolTypes = ($def.tools | ForEach-Object { $_.type }) -join ", "
        if (-not $toolTypes) { $toolTypes = "(none)" }

        Write-Host "$name v$($latest.version)" -ForegroundColor Cyan -NoNewline
        Write-Host " | $($def.model) | temp=$($def.temperature) | tools: $toolTypes"
    }
    catch {
        Write-Host "$name" -ForegroundColor Red -NoNewline
        Write-Host " | NOT FOUND"
    }
}
