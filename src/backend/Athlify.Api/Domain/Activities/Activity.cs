using Athlify.Api.Domain.Common;
using Athlify.Api.Domain.Tags;
using Athlify.Api.Domain.Vehicles;
using HotChocolate.Types.Relay;

namespace Athlify.Api.Domain.Activities;

public enum ActivityType
{
    Road,
    Mountain,
    Gravel,
    Indoor,
}

public enum Mood
{
    VeryBad,
    Bad,
    Neutral,
    Good,
    VeryGood,
}

public enum Wind
{
    Calm,
    Light,
    Moderate,
    Strong,
    Stormy,
}

/// <summary>
/// One cycling session. Deleting it is a soft delete: <see cref="DeletedAt"/> is set and the named query
/// filter <c>NotDeleted</c> hides it everywhere, so a later Strava synchronization can still recognize it.
/// </summary>
[Node(NodeResolverType = typeof(ActivityNode), NodeResolver = nameof(ActivityNode.GetAsync))]
public class Activity : Entity, IOwned
{
    [GraphQLIgnore]
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

    [GraphQLIgnore]
    public DateTime? DeletedAt { get; set; }

    [GraphQLIgnore]
    public int? VehicleId { get; set; }

    public Vehicle? Vehicle { get; set; }

    [GraphQLIgnore]
    public int? MergeId { get; set; }

    /// <summary>The merge this activity belongs to; changed only through the merge mutations.</summary>
    public ActivityMerge? Merge { get; set; }

    public ICollection<Tag> Tags { get; set; } = [];

    public void Recalculate()
    {
        AverageSpeed = Time > 0 ? Distance / (Time / 3600.0) : null;
    }
}

/// <summary>
/// Client input for an <see cref="Activity"/>. Calculated and system fields are not part of it;
/// <c>tagIds</c> is the complete set of tags.
/// </summary>
public record ActivityDto
{
    public DateTime Date { get; set; }
    public ActivityType Type { get; set; }
    public int Time { get; set; }
    public double Distance { get; set; }
    public double? ElevationGain { get; set; }
    public string? Description { get; set; }
    public int? HeartRateMin { get; set; }
    public int? HeartRateMax { get; set; }
    public int? HeartRateAverage { get; set; }
    public Mood? Mood { get; set; }
    public int? Effort { get; set; }
    public Wind? Wind { get; set; }

    [ID<Vehicle>]
    public int? VehicleId { get; set; }

    [ID<Tag>]
    public IReadOnlyList<int> TagIds { get; set; } = [];
}

public static class ActivityValidation
{
    public const int MaxDescriptionLength = 2000;
    public const int MinHeartRate = 20;
    public const int MaxHeartRate = 250;

    public static void ThrowIfInvalid(ActivityDto dto, DateTime now)
    {
        var errors = new ValidationErrors();
        errors.AddIf(dto.Time <= 0, "Time must be greater than 0.");
        errors.AddIf(!(dto.Distance >= 0), "Distance must not be negative.");
        errors.AddIf(dto.ElevationGain < 0, "Elevation gain must not be negative.");
        errors.AddIf(UtcDateTime.Normalize(dto.Date) > now.AddDays(1), "The date must not be in the future.");
        errors.AddIf(dto.Effort is < 1 or > 10, "Effort must be between 1 and 10.");
        errors.Text(dto.Description, "Description", MaxDescriptionLength, required: false);

        foreach (var (value, name) in new[]
                 {
                     (dto.HeartRateMin, "Minimum heart rate"),
                     (dto.HeartRateMax, "Maximum heart rate"),
                     (dto.HeartRateAverage, "Average heart rate"),
                 })
        {
            errors.AddIf(value is < MinHeartRate or > MaxHeartRate,
                $"{name} must be between {MinHeartRate} and {MaxHeartRate}.");
        }

        errors.AddIf(dto.HeartRateMin > dto.HeartRateMax, "Minimum heart rate must not be above the maximum.");
        errors.AddIf(dto.HeartRateAverage < dto.HeartRateMin, "Average heart rate must not be below the minimum.");
        errors.AddIf(dto.HeartRateAverage > dto.HeartRateMax, "Average heart rate must not be above the maximum.");
        errors.ThrowIfAny();
    }
}
