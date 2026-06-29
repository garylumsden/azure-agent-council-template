# Agent Council — Azure Architecture

## Overview

```mermaid
graph LR
    User["👤 User"] --> Blazor["Blazor Server<br/>.NET 10"]
    Blazor --> Foundry["Microsoft Foundry<br/>9 Prompt Agents<br/>2 Workflows<br/>Memory"]
    Blazor --> Cosmos[("Cosmos DB<br/>Assessments · Nexuses<br/>Documents · Deliberations")]
    Blazor --> Blob[("Blob Storage<br/>Document files")]
    Foundry --> GPT["gpt-4.1"]
    Foundry --> Memory["gc-deliberation-memory"]
    Blazor -.-> SignalR["SignalR<br/>Live feedback"]
    Blazor -.-> AppInsights["App Insights"]

    style User fill:#4A90D9,color:#fff
    style Blazor fill:#2D7D46,color:#fff
    style Foundry fill:#7B2D8E,color:#fff
    style Cosmos fill:#D4760A,color:#fff
    style Blob fill:#D4760A,color:#fff
    style GPT fill:#9B59B6,color:#fff
    style Memory fill:#9B59B6,color:#fff
    style SignalR fill:#2D7D46,color:#fff
    style AppInsights fill:#1A7A7A,color:#fff
```

> **Deployment**: Blazor Server app running locally or in a container. Not yet deployed as a Foundry Hosted Agent. All Azure resources provisioned via Bicep (`azd up`). Zero keys — Entra ID + RBAC everywhere.

## Detailed Architecture

```mermaid
graph TB
    %% =====================================================================
    %% Styling
    %% =====================================================================
    classDef user fill:#4A90D9,stroke:#2C5F8A,color:#fff,stroke-width:2px
    classDef web fill:#2D7D46,stroke:#1B5E2E,color:#fff,stroke-width:2px
    classDef foundry fill:#7B2D8E,stroke:#5A1F6A,color:#fff,stroke-width:2px
    classDef agent fill:#9B59B6,stroke:#7D3C98,color:#fff,stroke-width:1px
    classDef data fill:#D4760A,stroke:#A35D08,color:#fff,stroke-width:2px
    classDef monitor fill:#1A7A7A,stroke:#105555,color:#fff,stroke-width:2px
    classDef identity fill:#C0392B,stroke:#922B21,color:#fff,stroke-width:2px
    classDef search fill:#2980B9,stroke:#1F618D,color:#fff,stroke-width:2px

    %% =====================================================================
    %% User & Web Tier
    %% =====================================================================
    User["👤 User<br/>(Entra ID authenticated)"]:::user

    subgraph WebTier["Blazor Server App (.NET 10)"]
        direction TB
        Blazor["Blazor Server Web App<br/>.NET 10<br/>Dashboard · Document Library<br/>Assessment Detail · Nexus Explorer"]:::web
        SignalR["SignalR Hub<br/>/hubs/deliberation<br/>Live deliberation feedback"]:::web
    end

    User -->|"Entra ID auth<br/>Azure AI User role"| Blazor
    Blazor --- SignalR

    %% =====================================================================
    %% Microsoft Foundry (new) — AI Services + Project
    %% =====================================================================
    subgraph FoundryPlatform["Microsoft Foundry (new)"]
        direction TB

        AIServices["Azure AI Services<br/>(S0, disableLocalAuth: true)<br/>services.ai.azure.com"]:::foundry

        subgraph ModelDeployments["Model Deployments"]
            direction LR
            GPT41["gpt-4.1<br/>(All Council Agents)"]:::agent
            Embedding["text-embedding-3-small<br/>(Memory embeddings)"]:::agent
        end

        FoundryProject["Foundry Project<br/>'Agent Council'<br/>(System-assigned MI)"]:::foundry

        subgraph AgentLayer["Prompt Agents (9)"]
            direction LR
            Chair["Council Chair"]:::agent
            CDIO["CDIO"]:::agent
            CISO["CISO"]:::agent
            DPO["DPO"]:::agent
            Finance["Finance"]:::agent
            Policy["Policy"]:::agent
            People["People"]:::agent
            Analyst["Analyst"]:::agent
            NexusAnalyst["Nexus Analyst"]:::agent
        end

        subgraph Workflows["Declarative Workflows (CSDL YAML)"]
            direction LR
            SeqWF["Sequential Workflow<br/>CDIO→CISO→DPO→Finance<br/>→Policy→People→Analyst→Chair"]:::foundry
            GCWF["Group Chat Workflow<br/>Moderator-routed<br/>multi-round discussion"]:::foundry
        end

        Memory["Foundry Memory (preview)<br/>gc-deliberation-memory<br/>9 scoped boundaries"]:::foundry

    end

    Blazor -->|"Azure.AI.Projects SDK<br/>+ REST API<br/>(DefaultAzureCredential)"| FoundryProject
    FoundryProject --> Workflows
    Workflows --> AgentLayer
    AgentLayer --> ModelDeployments
    AgentLayer --> Memory


    %% =====================================================================
    %% Data Tier
    %% =====================================================================
    subgraph DataTier["Data Tier (identity-based auth, zero keys)"]
        direction TB

        subgraph CosmosDB["Azure Cosmos DB NoSQL (serverless)"]
            direction LR
            Assessments[("assessments<br/>/assessmentId")]:::data
            Nexuses[("nexuses<br/>/sourceAssessmentId")]:::data
            Documents[("Documents<br/>/DocumentId")]:::data
            Deliberations[("deliberations<br/>/deliberationId")]:::data
        end

        subgraph BlobStorage["Azure Blob Storage (no shared keys)"]
            direction LR
            BlobOriginal[("Documents-original<br/>PDF · DOCX · HTML")]:::data
            BlobMarkdown[("Documents-markdown<br/>Converted MD")]:::data
        end
    end

    Blazor -->|"Microsoft.Azure.Cosmos<br/>(DefaultAzureCredential)"| CosmosDB
    Blazor -->|"Azure.Storage.Blobs<br/>(DefaultAzureCredential)"| BlobStorage
    FoundryProject -->|"Blob Data Contributor"| BlobStorage

    %% =====================================================================
    %% Search & Knowledge
    %% =====================================================================
    SearchService["Azure AI Search (basic)<br/>Semantic search · Indexes"]:::search

    AIServices -->|"Search Index Data R/W<br/>(System MI)"| SearchService
    SearchService -->|"Cog Services User<br/>(Search MI → AI Services)"| AIServices

    %% =====================================================================
    %% Monitoring
    %% =====================================================================
    subgraph Monitoring["Observability"]
        direction LR
        AppInsights["Application Insights<br/>OpenTelemetry<br/>GenAI semantic conventions"]:::monitor
        LogAnalytics["Log Analytics Workspace<br/>(30-day retention)"]:::monitor
    end

    Blazor -->|"Traces · Metrics<br/>Distributed tracing"| AppInsights
    AppInsights --> LogAnalytics

    %% =====================================================================
    %% Identity
    %% =====================================================================
    EntraID["Microsoft Entra ID<br/>DefaultAzureCredential<br/>Zero-key authentication"]:::identity

    EntraID -.->|"RBAC role assignments"| FoundryProject
    EntraID -.->|"RBAC role assignments"| AIServices
    EntraID -.->|"RBAC role assignments"| CosmosDB
    EntraID -.->|"RBAC role assignments"| BlobStorage
    EntraID -.->|"RBAC role assignments"| SearchService
```

## RBAC Model

```mermaid
graph LR
    classDef principal fill:#4A90D9,stroke:#2C5F8A,color:#fff
    classDef resource fill:#D4760A,stroke:#A35D08,color:#fff
    classDef role fill:#2D7D46,stroke:#1B5E2E,color:#fff,font-size:10px

    User["👤 Deploying User"]:::principal
    ProjectMI["🤖 Project MI"]:::principal
    AIServicesMI["🤖 AI Services MI"]:::principal
    SearchMI["🤖 Search MI"]:::principal

    AIS["AI Services"]:::resource
    FP["Foundry Project"]:::resource
    CDB["Cosmos DB"]:::resource
    SA["Storage Account"]:::resource
    SS["AI Search"]:::resource
    LA["Log Analytics"]:::resource
    AI["App Insights"]:::resource

    User -->|"Cog Services User<br/>Cog Services OpenAI User"| AIS
    User -->|"AI User<br/>AI Project Manager"| FP
    User -->|"Data Contributor"| CDB
    User -->|"Blob Data Owner"| SA
    User -->|"Search Service Contributor<br/>Index Data Contributor<br/>Index Data Reader"| SS
    User -->|"Log Analytics Contributor"| LA
    User -->|"Monitoring Contributor"| AI

    ProjectMI -->|"AI User"| FP
    ProjectMI -->|"Cog Services User"| AIS
    ProjectMI -->|"Blob Data Contributor"| SA
    ProjectMI -->|"Data Contributor"| CDB
    ProjectMI -->|"Search Service Contributor<br/>Index Data Contributor<br/>Index Data Reader"| SS

    AIServicesMI -->|"Blob Data Contributor"| SA
    AIServicesMI -->|"Search Service Contributor<br/>Index Data Contributor<br/>Index Data Reader"| SS
    AIServicesMI -->|"Data Contributor"| CDB

    SearchMI -->|"Cog Services User"| AIS
```

## Deployment Model

```mermaid
graph TB
    classDef infra fill:#7B2D8E,stroke:#5A1F6A,color:#fff
    classDef deploy fill:#2D7D46,stroke:#1B5E2E,color:#fff
    classDef container fill:#D4760A,stroke:#A35D08,color:#fff

    Dev["Developer Workstation"]:::deploy
    AZD["azd up<br/>(Azure Developer CLI)"]:::deploy
    Bicep["Bicep IaC<br/>main.bicep → resources.bicep<br/>model-deployment.bicep"]:::infra

    Dev -->|"1. Provision infra"| AZD
    AZD --> Bicep
    Bicep -->|"Creates resource group<br/>rg-{environmentName}"| RG["Azure Resource Group"]:::infra

    subgraph RG_Contents["Resource Group Contents"]
        direction LR
        R1["AI Services (S0)"]:::infra
        R2["Foundry Project"]:::infra
        R3["gpt-4.1 deployment"]:::infra
        R5["text-embedding-3-small"]:::infra
        R6["Cosmos DB (serverless)"]:::infra
        R7["Storage Account"]:::infra
        R8["AI Search (basic)"]:::infra
        R9["App Insights"]:::infra
        R10["Log Analytics"]:::infra
    end

    RG --> RG_Contents

    Dockerfile["Dockerfile<br/>SDK build → ASP.NET 10 runtime<br/>Port 8080"]:::container
    Dev -->|"2. Run locally or<br/>deploy container"| Container["Container / Local Dev"]:::container
    Dockerfile --> Container
```

## Data Flow — Deliberation Lifecycle

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant B as Blazor Server
    participant SR as SignalR Hub
    participant F as Foundry Project
    participant WF as Workflow (Sequential/GroupChat)
    participant A as Agents (7 members)
    participant CH as Council Chair
    participant NA as Nexus Analyst
    participant C as Cosmos DB
    participant BL as Blob Storage

    U->>B: Upload Document (PDF/DOCX/URL/MD)
    B->>BL: Store original + markdown
    B->>C: Create Document record

    U->>B: Submit for deliberation
    B->>C: Create Deliberation (status: Pending)
    B->>SR: Navigate to /deliberation/{id}/live
    SR-->>U: Spinner + Document preview

    B->>F: Invoke workflow (Responses API)
    F->>WF: Execute deliberation

    alt Sequential Mode
        WF->>A: CDIO → CISO → DPO → Finance → Policy → People → Analyst
        A-->>WF: Each agent responds (shared conversation)
    else GroupChat Mode
        loop Moderated rounds (max 14)
            WF->>A: Moderator selects next speaker
            A-->>WF: Member responds
        end
    end

    WF->>CH: Chair synthesises all opinions
    CH-->>WF: Assessment JSON (recommendation, votes, risks)
    WF-->>F: Workflow complete
    F-->>B: Assessment response

    B->>C: Persist Assessment + Deliberation (status: Completed)
    SR-->>U: DeliberationComplete → redirect to Assessment Detail

    B->>F: Invoke Nexus Analyst
    F->>NA: Compare new assessment vs all prior
    NA-->>F: Discovered nexuses
    F-->>B: Nexus results
    B->>C: Persist Nexuses
```
