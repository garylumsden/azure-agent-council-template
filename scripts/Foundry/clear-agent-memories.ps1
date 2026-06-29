<#
.SYNOPSIS
    Clears stored memories for one or all agent scopes.
.DESCRIPTION
    Deletes all memories within the specified scope(s) from the memory store.
    The store itself is preserved.
.EXAMPLE
    .\clear-agent-memories.ps1                    # Clears all 8 agent scopes
    .\clear-agent-memories.ps1 -Scope chair       # Clears only the chair's memories
#>
[CmdletBinding()]
param(
    [string]$Scope,
    [string]$StoreName = "gc-deliberation-memory"
)

. $PSScriptRoot\..\gc-common.ps1

$headers = Get-FoundryHeaders

$scopes = if ($Scope) { @($Scope) } else { $script:AgentsWithMemory | ForEach-Object { $_.Scope } }

foreach ($s in $scopes) {
    $body = @{ scope = $s } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "$script:Endpoint/memory_stores/$StoreName`:delete_scope?api-version=$script:ApiVersion" `
            -Headers $headers -Method Post -Body $body | Out-Null
        Write-Host "Cleared: $s" -ForegroundColor Green
    }
    catch {
        Write-Host "Failed to clear $s`: $($_.Exception.Message)" -ForegroundColor Red
    }
}
