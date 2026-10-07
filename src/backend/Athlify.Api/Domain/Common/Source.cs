namespace Athlify.Api.Domain.Common;

/// <summary>Where a record comes from; set by the server, never by the client.</summary>
public enum Source
{
    Manual,
    Strava,
}
