# Common configuration and helpers for Governance Council maintenance scripts.
# Dot-source this file: . $PSScriptRoot\..\gc-common.ps1 (from subdirs)
#                    or: . $PSScriptRoot\gc-common.ps1   (from scripts root)

# --- Configuration: read from the azd-generated .env (the same config the app uses) ---
# No deployment-specific values are hard-coded. Load src/GovernanceCouncil.Web/.env if present,
# then resolve everything from the environment (values already in the process env win).
$envFile = Join-Path $PSScriptRoot "..\src\GovernanceCouncil.Web\.env"
if (Test-Path $envFile) {
    foreach ($line in Get-Content $envFile) {
        if ($line -match '^\s*#' -or $line -notmatch '=') { continue }
        $name, $value = $line -split '=', 2
        $name = $name.Trim()
        if ($name -and -not (Test-Path "env:$name")) {
            Set-Item -Path "env:$name" -Value $value.Trim()
        }
    }
}

function Get-RequiredSetting([string]$Name) {
    $value = [Environment]::GetEnvironmentVariable($Name)
    if ([string]::IsNullOrWhiteSpace($value)) {
        throw "Required setting '$Name' is not set. Run 'azd up' (generates src/GovernanceCouncil.Web/.env) or set it in your environment."
    }
    return $value
}

# --- Foundry ---
$script:Endpoint = (Get-RequiredSetting 'AZURE_AI_FOUNDRY_ENDPOINT').TrimEnd('/')
$script:MemoryStoreName = if ($env:MEMORY_STORE_NAME) { $env:MEMORY_STORE_NAME } else { "gc-deliberation-memory" }
$script:ApiVersion = "2025-11-15-preview"

# --- Cosmos DB ---
$script:CosmosEndpoint = Get-RequiredSetting 'COSMOS_DB_ENDPOINT'
$script:CosmosDatabaseName = if ($env:COSMOS_DB_DATABASE_NAME) { $env:COSMOS_DB_DATABASE_NAME } else { "governance-council" }
$script:CosmosContainers = @(
    @{ Name = "assessments";   PartitionKey = "/assessmentId" },
    @{ Name = "nexuses";       PartitionKey = "/sourceAssessmentId" },
    @{ Name = "dossiers";      PartitionKey = "/dossierId" },
    @{ Name = "deliberations"; PartitionKey = "/deliberationId" }
)

# --- Blob Storage ---
$script:StorageAccountName = Get-RequiredSetting 'STORAGE_ACCOUNT_NAME'
$script:BlobContainers = @("dossiers-original", "dossiers-markdown")

# --- Agents ---
$script:AgentsWithMemory = @(
    @{ Name = "gc-chair";    Scope = "chair" },
    @{ Name = "gc-cdio";     Scope = "cdio" },
    @{ Name = "gc-ciso";     Scope = "ciso" },
    @{ Name = "gc-dpo";      Scope = "dpo" },
    @{ Name = "gc-finance";  Scope = "finance" },
    @{ Name = "gc-policy";   Scope = "policy" },
    @{ Name = "gc-people";   Scope = "people" },
    @{ Name = "gc-analyst";  Scope = "analyst" }
)

$script:AllAgents = @("gc-moderator", "gc-chair", "gc-cdio", "gc-ciso", "gc-dpo", "gc-finance", "gc-policy", "gc-people", "gc-analyst", "gc-nexus-analyst")

# --- Helpers ---
function Get-FoundryToken {
    $token = az account get-access-token --resource https://ai.azure.com/ --query accessToken -o tsv 2>$null
    if (-not $token) { throw "Failed to get access token. Run 'az login' first." }
    return $token
}

function Get-FoundryHeaders {
    return @{
        "Authorization" = "Bearer $(Get-FoundryToken)"
        "Content-Type"  = "application/json"
    }
}

function Get-AgentDefinition {
    param([string]$AgentName)
    $headers = Get-FoundryHeaders
    $agent = Invoke-RestMethod -Uri "$script:Endpoint/agents/$AgentName`?api-version=v1" -Headers $headers -Method Get
    return $agent.versions.latest
}

function Get-CosmosToken {
    $token = az account get-access-token --resource "https://cosmos.azure.com" --query accessToken -o tsv 2>$null
    if (-not $token) { throw "Failed to get Cosmos DB access token." }
    return $token
}

function Get-CosmosHeaders {
    return @{
        "Authorization" = "type=aad&ver=1.0&sig=$(Get-CosmosToken)"
        "x-ms-version"  = "2018-12-31"
        "Content-Type"  = "application/json"
    }
}

function Get-StorageToken {
    $token = az account get-access-token --resource https://storage.azure.com/ --query accessToken -o tsv 2>$null
    if (-not $token) { throw "Failed to get Storage access token." }
    return $token
}
