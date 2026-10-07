using Athlify.Api.Domain.Common;

namespace Athlify.Api.Domain.Strava;

public enum SyncStatus
{
    Never,
    Success,
    Failed,
}

/// <summary>
/// A user's Strava connection. Prepared for the Strava synchronization feature and not exposed through the
/// API: the tokens must be stored encrypted and never leave the backend.
/// </summary>
public class StravaConnection : Entity, IOwned
{
    public int UserId { get; set; }

    public long StravaAthleteId { get; set; }

    /// <summary>Encrypted access token.</summary>
    public string AccessToken { get; set; } = string.Empty;

    /// <summary>Encrypted refresh token.</summary>
    public string RefreshToken { get; set; } = string.Empty;

    public DateTime TokenExpiresAt { get; set; }
    public string Scope { get; set; } = string.Empty;
    public DateTime? LastSyncAt { get; set; }
    public SyncStatus LastSyncStatus { get; set; } = SyncStatus.Never;
    public string? LastSyncError { get; set; }
}
