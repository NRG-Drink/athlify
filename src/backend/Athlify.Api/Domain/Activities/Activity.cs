using Athlify.Api.Domain.Common;
using Athlify.Api.Domain.Gadgets;
using Athlify.Api.Domain.Tags;
using Athlify.Api.Domain.Vehicles;

namespace Athlify.Api.Domain.Activities;

/// <summary>
/// One cycling session. Deleting it is a soft delete: <see cref="DeletedAt"/> is set and the named query
/// filter <c>NotDeleted</c> hides it everywhere, so a later Strava synchronization can still recognize it.
/// </summary>
public class Activity : Entity, IOwned
{
    public int UserId { get; set; }

    /// <summary>Date and start time.</summary>
    public DateTime Date { get; set; }

    public ActivityType Type { get; set; }

    /// <summary>Duration in seconds.</summary>
    public int Time { get; set; }

    /// <summary>Distance in kilometers.</summary>
    public double Distance { get; set; }

    /// <summary>km/h, calculated from <see cref="Distance"/> and <see cref="Time"/>; never client input.</summary>
    public double? AverageSpeed { get; private set; }

    /// <summary>Elevation gain in meters.</summary>
    public double? ElevationGain { get; set; }

    /// <summary>Training Stress Score; calculated by the analytics feature, empty until then.</summary>
    public double? Tss { get; set; }

    public string? Description { get; set; }
    public int? HeartRateMin { get; set; }
    public int? HeartRateMax { get; set; }
    public int? HeartRateAverage { get; set; }
    public Mood? Mood { get; set; }

    /// <summary>Subjective effort from 1 to 10.</summary>
    public int? Effort { get; set; }

    public Wind? Wind { get; set; }
    public Source Source { get; set; } = Source.Manual;

    /// <summary>External Strava activity id; set only by the Strava synchronization.</summary>
    public long? StravaActivityId { get; set; }

    public DateTime? DeletedAt { get; set; }

    public int? VehicleId { get; set; }

    public Vehicle? Vehicle { get; set; }

    public int? MergeId { get; set; }

    /// <summary>The merge this activity belongs to; changed only through the merge mutations.</summary>
    public ActivityMerge? Merge { get; set; }

    public ICollection<Tag> Tags { get; set; } = [];

    public ICollection<Gadget> Gadgets { get; set; } = [];

    public void Recalculate()
    {
        AverageSpeed = Time > 0 ? Distance / (Time / 3600.0) : null;
    }
}
