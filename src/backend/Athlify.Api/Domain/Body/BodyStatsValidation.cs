using Athlify.Api.Domain.Common;

namespace Athlify.Api.Domain.Body;

/// <summary>Server-side validation of <see cref="BodyStatsDto"/>; the frontend validation is only feedback.</summary>
public static class BodyStatsValidation
{
    public const int MaxCommentLength = 2000;
    public const int MaxComments = 1;
    public const string ErrorCode = DomainErrors.ValidationCode;

    public static void ThrowIfInvalid(BodyStatsDto dto)
    {
        var errors = new List<IError>();

        void Fail(string message) =>
            errors.Add(ErrorBuilder.New().SetMessage(message).SetCode(ErrorCode).Build());

        if (!(dto.Weight > 0)) Fail("Weight must be greater than 0.");
        if (!(dto.BoneMass > 0)) Fail("Bone mass must be greater than 0.");
        if (!IsPercentage(dto.BodyFatPercentage)) Fail("Body fat percentage must be between 0 and 100.");
        if (!IsPercentage(dto.MusclePercentage)) Fail("Muscle percentage must be between 0 and 100.");
        if (!IsPercentage(dto.WaterPercentage)) Fail("Water percentage must be between 0 and 100.");

        if (dto.Comments.Count > MaxComments) Fail("A measurement can have at most one note.");

        foreach (var comment in dto.Comments)
        {
            if (string.IsNullOrWhiteSpace(comment.Content))
                Fail("A note must not be empty.");
            else if (comment.Content.Length > MaxCommentLength)
                Fail($"A note must not be longer than {MaxCommentLength} characters.");
        }

        if (errors.Count > 0) throw new GraphQLException(errors);
    }

    private static bool IsPercentage(double value) => value is >= 0 and <= 100;
}
