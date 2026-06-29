<#
.SYNOPSIS
    Deletes all memory stores from the Foundry project.
.DESCRIPTION
    Lists and deletes every memory store. Use -WhatIf to preview without deleting.
.EXAMPLE
    .\delete-memory-stores.ps1
    .\delete-memory-stores.ps1 -WhatIf
#>
[CmdletBinding(SupportsShouldProcess)]
param()

. $PSScriptRoot\..\gc-common.ps1

$headers = Get-FoundryHeaders
$stores = Invoke-RestMethod -Uri "$script:Endpoint/memory_stores?api-version=$script:ApiVersion" -Headers $headers -Method Get

if ($stores.data.Count -eq 0) {
    Write-Host "No memory stores to delete." -ForegroundColor Yellow
    return
}

foreach ($s in $stores.data) {
    if ($PSCmdlet.ShouldProcess($s.name, "Delete memory store")) {
        Invoke-WebRequest -Uri "$script:Endpoint/memory_stores/$($s.name)?api-version=$script:ApiVersion" `
            -Headers $headers -Method Delete | Out-Null
        Write-Host "Deleted: $($s.name)" -ForegroundColor Red
    }
}
