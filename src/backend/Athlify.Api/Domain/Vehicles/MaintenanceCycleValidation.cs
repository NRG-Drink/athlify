using Athlify.Api.Domain.Common;

namespace Athlify.Api.Domain.Vehicles;

/// <summary>Server-side validation of <see cref="MaintenanceCycleInput"/>.</summary>
public static class MaintenanceCycleValidation
{
    public const int MaxNameLength = 100;
    public const int MaxDescriptionLength = 2000;

    public static void ThrowIfInvalid(MaintenanceCycleInput input)
    {
        var errors = new ValidationErrors();
        errors.AddIf((input.VehicleId is null) == (input.GadgetId is null),
            "A maintenance cycle belongs to exactly one bicycle or one gadget.");
        errors.Text(input.Name, "Name", MaxNameLength, required: true);
        errors.Text(input.Description, "Description", MaxDescriptionLength, required: false);
        errors.AddIf(input.IntervalDistance is null && input.IntervalDays is null,
            "Set an interval in kilometers or in days.");
        errors.AddIf(input.IntervalDistance <= 0, "The distance interval must be greater than 0.");
        errors.AddIf(input.IntervalDays <= 0, "The day interval must be greater than 0.");
        errors.ThrowIfAny();
    }
}
