namespace GovernanceCouncil.Agents.Nexus;

using System.Reflection;
using System.Text.Json;
using Azure.AI.OpenAI;
using Azure.AI.Projects;
using Azure.AI.Extensions.OpenAI;
using GovernanceCouncil.Agents.Provisioning;
using GovernanceCouncil.Core.Interfaces;
using GovernanceCouncil.Core.Models;
using Microsoft.Extensions.Logging;

/// <summary>
/// Post-deliberation service that invokes the Nexus Analyst agent to discover
/// interconnections between a new assessment and all prior assessments.
/// </summary>
public sealed class NexusAnalystService
{
    private readonly AIProjectClient _projectClient;
    private readonly AzureOpenAIClient _azureOpenAI;
    private readonly IAssessmentStore _assessmentStore;
    private readonly INexusStore _nexusStore;
    private readonly ILogger<NexusAnalystService> _logger;

    private readonly string _agentName = $"gc-{CouncilMembers.NexusAnalyst.Id}";

    // Bounded candidate retrieval config. Embedding model is text-embedding-3-small (already
    // deployed); TopK caps how many priors we feed the LLM so the prompt scales with corpus size.
    private static readonly int TopK =
        int.TryParse(Environment.GetEnvironmentVariable("COUNCIL_NEXUS_TOPK"), out var k) && k > 0 ? k : 8;
    private static readonly string EmbeddingModel =
        Environment.GetEnvironmentVariable("COUNCIL_EMBEDDING_MODEL") is { Length: > 0 } m ? m : "text-embedding-3-small";

    public NexusAnalystService(
        AIProjectClient projectClient,
        AzureOpenAIClient azureOpenAI,
        IAssessmentStore assessmentStore,
        INexusStore nexusStore,
        ILogger<NexusAnalystService>? logger = null)
    {
        _projectClient = projectClient;
        _azureOpenAI = azureOpenAI;
        _assessmentStore = assessmentStore;
        _nexusStore = nexusStore;
        _logger = logger ?? Microsoft.Extensions.Logging.Abstractions.NullLogger<NexusAnalystService>.Instance;
    }

    /// <summary>
    /// Analyses a new assessment against all prior assessments to discover interconnections.
    /// Returns any newly discovered Nexus objects.
    /// </summary>
    public async Task<IReadOnlyList<Nexus>> AnalyseAsync(string assessmentId, CancellationToken ct = default)
    {
        _logger.LogInformation("Starting nexus analysis for assessment {AssessmentId}", assessmentId);

        var newAssessment = await _assessmentStore.GetAsync(assessmentId, ct);

        // Bounded candidate retrieval via Cosmos vector search (server-side ANN over stored embeddings).
        var candidates = await SelectTopKPriorsAsync(newAssessment, TopK, ct);
        if (candidates.Count == 0)
            return [];

        var prompt = BuildNexusPrompt(newAssessment, candidates);
        var response = await InvokeAgentAsync(prompt, ct);
        var nexuses = ParseNexuses(response, assessmentId);

        foreach (var nexus in nexuses)
            await _nexusStore.UpsertAsync(nexus, ct);

        _logger.LogInformation("Nexus analysis complete for assessment {AssessmentId}, discovered {NexusCount} nexuses", assessmentId, nexuses.Count);
        return nexuses;
    }

    /// <summary>
    /// Invokes the Nexus Analyst agent using the SDK conversation/response pattern.
    /// </summary>
    private async Task<string> InvokeAgentAsync(string userMessage, CancellationToken ct)
    {
        var openaiClient = _projectClient.ProjectOpenAIClient;
        var conversation = (await openaiClient.GetProjectConversationsClient()
            .CreateProjectConversationAsync(new Azure.AI.Extensions.OpenAI.ProjectConversationCreationOptions(), ct)).Value;

        var version = FoundryAgentHelpers.ResolveLatestVersion(_projectClient, _agentName, ct);
        var agentRef = new AgentReference(_agentName, version);
        var responseClient = openaiClient.GetProjectResponsesClientForAgent(agentRef, conversation.Id);

        var result = await responseClient.CreateResponseAsync(userMessage, cancellationToken: ct);
        return result.Value.GetOutputText();
    }

    private static string BuildNexusPrompt(Assessment newAssessment, List<Assessment> priorAssessments)
    {
        var priorSummaries = string.Join("\n\n", priorAssessments.Select(a =>
            $"""
            ### {a.AssessmentId} — {a.DossierTitle}
            - **Recommendation:** {a.OverallRecommendation}
            - **Date:** {a.ReviewDate:yyyy-MM-dd}
            - **Votes:** {string.Join(", ", a.Votes.Select(v => $"{v.Key}: {v.Value.Position}"))}
            - **Conditions:** {(a.Conditions.Count > 0 ? string.Join("; ", a.Conditions) : "None")}
            - **Risks:** {(a.Risks.Count > 0 ? string.Join("; ", a.Risks.Select(r => $"{r.Category}: {r.Description}")) : "None")}
            """));

        return $"""
            ## New Assessment for Nexus Analysis

            ### {newAssessment.AssessmentId} — {newAssessment.DossierTitle}
            - **Recommendation:** {newAssessment.OverallRecommendation}
            - **Date:** {newAssessment.ReviewDate:yyyy-MM-dd}
            - **Votes:** {string.Join(", ", newAssessment.Votes.Select(v => $"{v.Key}: {v.Value.Position}"))}
            - **Conditions:** {(newAssessment.Conditions.Count > 0 ? string.Join("; ", newAssessment.Conditions) : "None")}
            - **Risks:** {(newAssessment.Risks.Count > 0 ? string.Join("; ", newAssessment.Risks.Select(r => $"{r.Category}: {r.Description}")) : "None")}

            ---

            ## Prior Assessments

            {priorSummaries}

            ---

            Please analyse all interconnections between the new assessment and each prior assessment.
            Return your output as a JSON array of Nexus objects as defined in your instructions.
            """;
    }

    /// <summary>
    /// Computes the embedding for an assessment's summary (text-embedding-3-small, 1536-d) so it can be
    /// persisted on the document and reused for vector Top-K retrieval — no re-embedding per analysis.
    /// Returns null on failure (the assessment is still stored; retrieval falls back to recent-K).
    /// </summary>
    public async Task<float[]?> EmbedAssessmentAsync(Assessment assessment, CancellationToken ct = default)
        => await EmbedAsync(SummariseForEmbedding(assessment), ct);

    private async Task<float[]?> EmbedAsync(string text, CancellationToken ct)
    {
        try
        {
            // Use the Azure OpenAI data-plane client (same endpoint that serves the chat models).
            // The project OpenAI client doesn't expose the embeddings route and returns 404.
            var client = _azureOpenAI.GetEmbeddingClient(EmbeddingModel);
            var result = await client.GenerateEmbeddingsAsync([text], cancellationToken: ct);
            return result.Value[0].ToFloats().ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Embedding generation failed");
            return null;
        }
    }

    /// <summary>
    /// Bounded candidate retrieval via Cosmos vector search: embed only the NEW assessment's query
    /// (reusing its stored embedding when present), then ask Cosmos for the top-K nearest priors
    /// server-side. Falls back to the most-recent K when vector search is unavailable / cold.
    /// </summary>
    private async Task<List<Assessment>> SelectTopKPriorsAsync(
        Assessment newAssessment, int k, CancellationToken ct)
    {
        var queryVec = newAssessment.Embedding ?? await EmbedAsync(SummariseForEmbedding(newAssessment), ct);
        if (queryVec is not null)
        {
            var similar = await _assessmentStore.FindSimilarAsync(queryVec, k, newAssessment.AssessmentId, ct);
            if (similar.Count > 0)
            {
                _logger.LogInformation("Nexus retrieval: top {K} priors via Cosmos vector search", similar.Count);
                return [.. similar];
            }
        }

        // Cold start (no embedded priors yet) or vector search unavailable → most-recent K.
        var all = await _assessmentStore.ListAsync(ct);
        var recent = all.Where(a => a.AssessmentId != newAssessment.AssessmentId)
            .OrderByDescending(a => a.ReviewDate).Take(k).ToList();
        if (recent.Count > 0)
            _logger.LogInformation("Nexus retrieval: falling back to most-recent {K} priors", recent.Count);
        return recent;
    }

    private static string SummariseForEmbedding(Assessment a)
    {
        var risks = a.Risks.Count > 0 ? string.Join("; ", a.Risks.Select(r => $"{r.Category}: {r.Description}")) : "None";
        var conditions = a.Conditions.Count > 0 ? string.Join("; ", a.Conditions) : "None";
        return $"{a.DossierTitle}. Recommendation: {a.OverallRecommendation}. Conditions: {conditions}. Risks: {risks}.";
    }

    private List<Nexus> ParseNexuses(string response, string sourceAssessmentId)
    {
        // Extract JSON array from the response (may be wrapped in markdown code fences)
        var json = response;
        var jsonStart = response.IndexOf('[');
        var jsonEnd = response.LastIndexOf(']');
        if (jsonStart >= 0 && jsonEnd > jsonStart)
            json = response[jsonStart..(jsonEnd + 1)];

        JsonDocument doc;
        try
        {
            doc = JsonDocument.Parse(json);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Nexus Analyst returned unparseable JSON for assessment {AssessmentId}", sourceAssessmentId);
            return [];
        }

        using (doc)
        {
            return ParseNexusArray(doc.RootElement, sourceAssessmentId);
        }
    }

    private static List<Nexus> ParseNexusArray(JsonElement root, string sourceAssessmentId)
    {
        var nexuses = new List<Nexus>();

        if (root.ValueKind != JsonValueKind.Array)
            return nexuses;

        foreach (var el in root.EnumerateArray())
        {
            if (el.ValueKind != JsonValueKind.Object) continue;

            var nexusTypeStr = el.TryGetProperty("nexusType", out var nt) && nt.ValueKind == JsonValueKind.String
                ? nt.GetString() ?? "Implication"
                : "Implication";
            if (!Enum.TryParse<NexusType>(nexusTypeStr, ignoreCase: true, out var nexusType))
                nexusType = NexusType.Implication;

            var targetId = el.TryGetProperty("targetAssessmentId", out var tid) && tid.ValueKind == JsonValueKind.String
                ? tid.GetString() ?? "" : "";

            // A nexus links two assessments. Without a target it is not a link — drop it rather
            // than persist an orphan that no query can resolve.
            if (string.IsNullOrWhiteSpace(targetId)) continue;
            if (string.Equals(targetId, sourceAssessmentId, StringComparison.OrdinalIgnoreCase)) continue;

            // Deterministic ID: same source+target+type always produces the same nexus ID.
            // This ensures Cosmos upsert overwrites existing nexuses instead of creating duplicates.
            var compositeKey = $"{sourceAssessmentId}|{targetId}|{nexusType}";
            var nexusId = $"NX-{Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(compositeKey)))[..12].ToLowerInvariant()}";

            var nexusPoints = new List<NexusPoint>();
            var sourceExcerpt = el.TryGetProperty("sourceExcerpt", out var se) && se.ValueKind == JsonValueKind.String ? se.GetString() ?? "" : "";
            var targetExcerpt = el.TryGetProperty("targetExcerpt", out var te) && te.ValueKind == JsonValueKind.String ? te.GetString() ?? "" : "";
            var relationship = el.TryGetProperty("relationship", out var rel) && rel.ValueKind == JsonValueKind.String ? rel.GetString() ?? "" : "";

            if (!string.IsNullOrEmpty(sourceExcerpt) || !string.IsNullOrEmpty(targetExcerpt))
            {
                nexusPoints.Add(new NexusPoint
                {
                    SourceExcerpt = sourceExcerpt,
                    TargetExcerpt = targetExcerpt,
                    Relationship = relationship
                });
            }

            nexuses.Add(new Nexus
            {
                Id = nexusId,
                SourceAssessmentId = sourceAssessmentId,
                TargetAssessmentId = targetId,
                NexusType = nexusType,
                Summary = relationship,
                DiscoveredBy = CouncilMembers.NexusAnalyst.Name,
                DiscoveredDate = DateTimeOffset.UtcNow,
                NexusPoints = nexusPoints,
                Confidence = el.TryGetProperty("confidence", out var c) && c.ValueKind == JsonValueKind.String ? c.GetString() ?? "Medium" : "Medium",
                Status = "Active"
            });
        }

        return nexuses;
    }
}
