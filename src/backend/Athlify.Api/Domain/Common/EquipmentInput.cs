using Athlify.Api.Domain.Tags;
using HotChocolate.Types.Relay;

namespace Athlify.Api.Domain.Common;

/// <summary>Client input shared by bicycles and gadgets; <c>tagIds</c> is the complete set of tags.</summary>
public record EquipmentInput
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

/// <summary>Server-side validation of <see cref="EquipmentInput"/>.</summary>
public static class EquipmentValidation
{
    public const int MaxNameLength = 100;
    public const int MaxDescriptionLength = 2000;

    public static void ThrowIfInvalid(EquipmentInput input)
    {
        var errors = new ValidationErrors();
        errors.Text(input.Brand, "Brand", MaxNameLength, required: true);
        errors.Text(input.Model, "Model", MaxNameLength, required: true);
        errors.Text(input.Nickname, "Nickname", MaxNameLength, required: false);
        errors.Text(input.Description, "Description", MaxDescriptionLength, required: false);
        errors.AddIf(input.Price < 0, "Price must not be negative.");
        errors.AddIf(
            input.PurchaseDate is not null && input.DeactivationDate is not null
                && input.DeactivationDate < input.PurchaseDate,
            "The deactivation date must not be before the purchase date.");
        errors.ThrowIfAny();
    }

    /// <summary>Copies the shared fields; the links (tags and so on) are applied by the caller.</summary>
    public static void Apply(Equipment target, EquipmentInput input)
    {
        target.Brand = input.Brand.Trim();
        target.Model = input.Model.Trim();
        target.Nickname = Text.OrNull(input.Nickname);
        target.PurchaseDate = input.PurchaseDate;
        target.Description = Text.OrNull(input.Description);
        target.DeactivationDate = input.DeactivationDate;
        target.Price = input.Price;
    }
}
