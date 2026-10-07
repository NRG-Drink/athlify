using Athlify.Api.Domain.Common;

namespace Athlify.Api.Domain.Events;

/// <summary>Server-side validation of <see cref="EventInput"/>.</summary>
public static class EventValidation
{
    public const int MaxNameLength = 100;
    public const int MaxDescriptionLength = 2000;

    public static void ThrowIfInvalid(EventInput input)
    {
        var errors = new ValidationErrors();
        errors.Text(input.Name, "Name", MaxNameLength, required: true);
        errors.Text(input.Description, "Description", MaxDescriptionLength, required: false);
        errors.AddIf(input.EndDate < input.StartDate, "The end date must not be before the start date.");
        errors.ThrowIfAny();
    }
}
