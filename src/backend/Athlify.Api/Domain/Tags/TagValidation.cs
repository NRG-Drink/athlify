using Athlify.Api.Domain.Common;

namespace Athlify.Api.Domain.Tags;

/// <summary>Server-side validation of <see cref="TagInput"/>; uniqueness per user is checked against the database.</summary>
public static class TagValidation
{
    public const int MaxNameLength = 50;

    public static void ThrowIfInvalid(TagInput input)
    {
        var errors = new ValidationErrors();
        errors.Text(input.Name, "Name", MaxNameLength, required: true);
        errors.ThrowIfAny();
    }
}
