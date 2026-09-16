namespace GovernanceCouncil.Web.Hubs;

using System.Text.RegularExpressions;
using Microsoft.AspNetCore.SignalR;

/// <summary>
/// SignalR hub for streaming live deliberation progress to connected clients.
/// Agents publish their output in real-time as the deliberation progresses; clients join a
/// per-deliberation group to receive those updates.
/// </summary>
/// <remarks>
/// The app runs locally and is bound to loopback, so there is no per-user authorization.
/// The identifier is still validated so a client cannot join an arbitrary or malformed group.
/// If the app is ever hosted remotely, add authentication and an ownership check here.
/// </remarks>
public sealed partial class DeliberationHub : Hub
{
    private const int MaxIdLength = 128;

    [GeneratedRegex(@"^[A-Za-z0-9._:-]{1,128}$", RegexOptions.CultureInvariant)]
    private static partial Regex DeliberationIdPattern();

    /// <summary>
    /// Joins a deliberation room to receive live updates for a specific deliberation.
    /// </summary>
    public async Task JoinDeliberation(string deliberationId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, Validate(deliberationId));
    }

    /// <summary>
    /// Leaves a deliberation room.
    /// </summary>
    public async Task LeaveDeliberation(string deliberationId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, Validate(deliberationId));
    }

    private static string Validate(string deliberationId)
    {
        if (string.IsNullOrWhiteSpace(deliberationId)
            || deliberationId.Length > MaxIdLength
            || !DeliberationIdPattern().IsMatch(deliberationId))
        {
            throw new HubException("Invalid deliberation identifier.");
        }

        return deliberationId;
    }
}
