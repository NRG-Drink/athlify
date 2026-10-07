using Athlify.Api.Domain.Activities;
using Athlify.Api.Domain.Common;
using Athlify.Api.Domain.Gadgets;
using Athlify.Api.Domain.Tags;
using HotChocolate.Types.Relay;

namespace Athlify.Api.Domain.Vehicles;

/// <summary>A bicycle in the Garage.</summary>
[Node(NodeResolverType = typeof(VehicleNode), NodeResolver = nameof(VehicleNode.GetAsync))]
public class Vehicle : Entity, IOwned
{
    [GraphQLIgnore]
    public int UserId { get; set; }

    public string Brand { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string? Nickname { get; set; }
    public DateOnly? PurchaseDate { get; set; }
    public string? Description { get; set; }
    public DateOnly? DeactivationDate { get; set; }
    public decimal? Price { get; set; }
    public Source Source { get; set; } = Source.Manual;

    /// <summary>External Strava gear id; set only by the Strava synchronization.</summary>
    public string? StravaGearId { get; set; }

    public ICollection<Tag> Tags { get; set; } = [];

    /// <summary>Gadgets mounted on this bicycle; edited from the gadget.</summary>
    public ICollection<Gadget> Gadgets { get; set; } = [];

    public ICollection<MaintenanceCycle> MaintenanceCycles { get; set; } = [];

    // Only used to clear the bicycle on its activities when it is deleted.
    [GraphQLIgnore]
    public ICollection<Activity> Activities { get; set; } = [];
}

/// <summary>Client input for a <see cref="Vehicle"/>; <c>tagIds</c> is the complete set of tags.</summary>
public record VehicleInput
{
    public string Brand { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string? Nickname { get; set; }
    public DateOnly? PurchaseDate { get; set; }
    public string? Description { get; set; }
    public DateOnly? DeactivationDate { get; set; }
    public decimal? Price { get; set; }

    [ID<Tag>]
    public IReadOnlyList<int> TagIds { get; set; } = [];
}

/// <summary>The fields bicycles and gadgets share: brand, model, dates, price.</summary>
public static class EquipmentValidation
{
    public const int MaxNameLength = 100;
    public const int MaxDescriptionLength = 2000;

    public static void Validate(
        ValidationErrors errors,
        string brand,
        string model,
        string? nickname,
        string? description,
        DateOnly? purchaseDate,
        DateOnly? deactivationDate,
        decimal? price)
    {
        errors.Text(brand, "Brand", MaxNameLength, required: true);
        errors.Text(model, "Model", MaxNameLength, required: true);
        errors.Text(nickname, "Nickname", MaxNameLength, required: false);
        errors.Text(description, "Description", MaxDescriptionLength, required: false);
        errors.AddIf(price < 0, "Price must not be negative.");
        errors.AddIf(
            purchaseDate is not null && deactivationDate is not null && deactivationDate < purchaseDate,
            "The deactivation date must not be before the purchase date.");
    }
}
