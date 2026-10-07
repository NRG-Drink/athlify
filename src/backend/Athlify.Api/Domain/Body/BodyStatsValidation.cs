using Athlify.Api.Domain.Common;

namespace Athlify.Api.Domain.Body;

/// <summary>Server-side validation of <see cref="BodyStatsInput"/>; the frontend validation is only feedback.</summary>
public static class BodyStatsValidation
{
    public const int MaxCommentLength = 2000;
    public const int MaxComments = 1;

    public static void ThrowIfInvalid(BodyStatsInput input)
    {
        var errors = new ValidationErrors();
        errors.AddIf(!(input.Weight > 0), "Weight must be greater than 0.");
        errors.AddIf(!(input.BoneMass > 0), "Bone mass must be greater than 0.");
        errors.AddIf(!IsPercentage(input.BodyFatPercentage), "Body fat percentage must be between 0 and 100.");
        errors.AddIf(!IsPercentage(input.MusclePercentage), "Muscle percentage must be between 0 and 100.");
        errors.AddIf(!IsPercentage(input.WaterPercentage), "Water percentage must be between 0 and 100.");
        errors.AddIf(input.Comments.Count > MaxComments, "A measurement can have at most one note.");

        foreach (var comment in input.Comments)
        {
            if (string.IsNullOrWhiteSpace(comment.Content))
            {
                errors.Add("A note must not be empty.");
            }
            else
            {
                errors.AddIf(comment.Content.Length > MaxCommentLength,
                    $"A note must not be longer than {MaxCommentLength} characters.");
            }
        }

        errors.ThrowIfAny();
    }

    private static bool IsPercentage(double value) => value is >= 0 and <= 100;
}
