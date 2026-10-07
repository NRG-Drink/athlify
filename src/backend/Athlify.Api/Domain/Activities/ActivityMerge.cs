using Athlify.Api.Domain.Common;

namespace Athlify.Api.Domain.Activities;

/// <summary>
/// Shows at least two activities as one, without changing them. An activity belongs to at most one merge.
/// The totals cover the active members and are kept up to date by <see cref="MergeMembership"/>.
/// </summary>
public class ActivityMerge : Entity, IOwned
{
    public int UserId { get; set; }

    public string? Name { get; set; }

    /// <summary>Active members; soft-deleted activities are hidden by the query filter.</summary>
    public ICollection<Activity> Activities { get; set; } = [];

    /// <summary>Seconds.</summary>
    public int TotalTime { get; set; }

    /// <summary>Kilometers.</summary>
    public double TotalDistance { get; set; }

    /// <summary>Meters; empty when no member has a value.</summary>
    public double? TotalElevationGain { get; set; }

    /// <summary>Empty when no member has a value.</summary>
    public double? TotalTss { get; set; }
}
