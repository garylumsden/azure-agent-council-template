<#
.SYNOPSIS
    Purges all Governance Council data by deleting and recreating Cosmos DB containers
    and Blob Storage containers.
.DESCRIPTION
    Deletes and recreates:
    - Cosmos DB containers: assessments, nexuses, dossiers, deliberations
    - Blob Storage containers: dossiers-original, dossiers-markdown

    Uses az CLI for Cosmos and REST for Blob Storage.
    Requires: Cosmos DB Data Contributor, Storage Blob Data Contributor roles.
.EXAMPLE
    .\purge-data.ps1
    .\purge-data.ps1 -WhatIf
#>
[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'High')]
param()

. $PSScriptRoot\..\gc-common.ps1

$ErrorActionPreference = "Stop"

$CosmosEndpoint = $script:CosmosEndpoint
$DatabaseName = $script:CosmosDatabaseName
$CosmosContainers = $script:CosmosContainers
$StorageAccount = $script:StorageAccountName
$BlobContainers = $script:BlobContainers

# Extract Cosmos account name from endpoint
$cosmosAccountName = ([Uri]$CosmosEndpoint).Host.Split('.')[0]
$resourceGroup = Get-RequiredSetting 'AZURE_RESOURCE_GROUP'

# --- Cosmos DB ---
Write-Host "`n=== Cosmos DB ===" -ForegroundColor Cyan
Write-Host "Account: $cosmosAccountName | Database: $DatabaseName"

foreach ($c in $CosmosContainers) {
    if ($PSCmdlet.ShouldProcess("$DatabaseName/$($c.Name)", "Delete and recreate Cosmos container")) {
        # Delete
        try {
            az cosmosdb sql container delete --account-name $cosmosAccountName --resource-group $resourceGroup `
                --database-name $DatabaseName --name $c.Name --yes 2>$null
            Write-Host "  Deleted: $($c.Name)" -ForegroundColor Red
        }
        catch {
            Write-Host "  Not found (skip delete): $($c.Name)" -ForegroundColor Yellow
        }

        # Recreate
        az cosmosdb sql container create --account-name $cosmosAccountName --resource-group $resourceGroup `
            --database-name $DatabaseName --name $c.Name --partition-key-path $c.PartitionKey 2>$null | Out-Null
        Write-Host "  Created: $($c.Name) (partition: $($c.PartitionKey))" -ForegroundColor Green
    }
}

# --- Blob Storage ---
Write-Host "`n=== Blob Storage ===" -ForegroundColor Cyan
Write-Host "Account: $StorageAccount"

$storageToken = Get-StorageToken
$storageBase = "https://$StorageAccount.blob.core.windows.net"

foreach ($container in $BlobContainers) {
    $containerUrl = "$storageBase/$container`?restype=container"

    if ($PSCmdlet.ShouldProcess($container, "Delete and recreate Blob container")) {
        # Delete
        try {
            Invoke-WebRequest -Uri $containerUrl `
                -Headers @{ "Authorization" = "Bearer $storageToken"; "x-ms-version" = "2021-08-06" } `
                -Method Delete | Out-Null
            Write-Host "  Deleted: $container" -ForegroundColor Red
            Start-Sleep -Seconds 5
        }
        catch {
            if ($_.Exception.Response.StatusCode -eq 404) {
                Write-Host "  Not found (skip delete): $container" -ForegroundColor Yellow
            }
            else { throw }
        }

        # Recreate
        $retries = 0
        while ($retries -lt 6) {
            try {
                Invoke-WebRequest -Uri $containerUrl `
                    -Headers @{ "Authorization" = "Bearer $storageToken"; "x-ms-version" = "2021-08-06" } `
                    -Method Put | Out-Null
                Write-Host "  Created: $container" -ForegroundColor Green
                break
            }
            catch {
                if ($_.Exception.Response.StatusCode -eq 409 -and $retries -lt 5) {
                    $retries++
                    Write-Host "  Waiting for delete to propagate ($retries/5)..." -ForegroundColor DarkGray
                    Start-Sleep -Seconds 10
                }
                else { throw }
            }
        }
    }
}

Write-Host "`nPurge complete." -ForegroundColor Green
