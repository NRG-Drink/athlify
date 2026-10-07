using Athlify.Api.Domain.Gadgets;
using Athlify.Api.Domain.Tags;
using Athlify.Api.Domain.Vehicles;
using HotChocolate.Types.Relay;

namespace Athlify.Api.Domain.Activities;

/// <summary>
/// Client input for an <see cref="Activity"/>. Calculated and system fields are not part of it;
/// <c>gadgetIds</c> and <c>tagIds</c> are complete sets.
/// </summary>
public record ActivityInput
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

    [ID<Gadget>]
    public IReadOnlyList<int> GadgetIds { get; set; } = [];

    [ID<Tag>]
    public IReadOnlyList<int> TagIds { get; set; } = [];
}
