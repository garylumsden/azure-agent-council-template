<#
.SYNOPSIS
    Lists all memory stores in the Foundry project.
.EXAMPLE
    .\list-memory-stores.ps1
#>
[CmdletBinding()]
param()

. $PSScriptRoot\..\gc-common.ps1

$headers = Get-FoundryHeaders
$stores = Invoke-RestMethod -Uri "$script:Endpoint/memory_stores?api-version=$script:ApiVersion" -Headers $headers -Method Get

if ($stores.data.Count -eq 0) {
    Write-Host "No memory stores found." -ForegroundColor Yellow
    return
}

foreach ($s in $stores.data) {
    $opts = $s.definition.options
    Write-Host "$($s.name)" -ForegroundColor Cyan -NoNewline
    Write-Host " | chat=$($s.definition.chat_model) | embed=$($s.definition.embedding_model) | user_profile=$($opts.user_profile_enabled) | chat_summary=$($opts.chat_summary_enabled)"
    if ($s.description) { Write-Host "  $($s.description)" -ForegroundColor DarkGray }
}
