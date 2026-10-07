using Athlify.Api.Domain.Common;

namespace Athlify.Api.Domain.Activities;

public static class ActivityValidation
{
    public const int MaxDescriptionLength = 2000;
    public const int MinHeartRate = 20;
    public const int MaxHeartRate = 250;

    public static void ThrowIfInvalid(ActivityInput input, DateTime now)
    {
        var errors = new ValidationErrors();
        errors.AddIf(input.Time <= 0, "Time must be greater than 0.");
        errors.AddIf(!(input.Distance >= 0), "Distance must not be negative.");
        errors.AddIf(input.ElevationGain < 0, "Elevation gain must not be negative.");
        errors.AddIf(UtcDateTime.Normalize(input.Date) > now.AddDays(1), "The date must not be in the future.");
        errors.AddIf(input.Effort is < 1 or > 10, "Effort must be between 1 and 10.");
        errors.Text(input.Description, "Description", MaxDescriptionLength, required: false);

        foreach (var (value, name) in new[]
                 {
                     (input.HeartRateMin, "Minimum heart rate"),
                     (input.HeartRateMax, "Maximum heart rate"),
                     (input.HeartRateAverage, "Average heart rate"),
                 })
        {
            errors.AddIf(value is < MinHeartRate or > MaxHeartRate,
                $"{name} must be between {MinHeartRate} and {MaxHeartRate}.");
        }

        errors.AddIf(input.HeartRateMin > input.HeartRateMax, "Minimum heart rate must not be above the maximum.");
        errors.AddIf(input.HeartRateAverage < input.HeartRateMin, "Average heart rate must not be below the minimum.");
        errors.AddIf(input.HeartRateAverage > input.HeartRateMax, "Average heart rate must not be above the maximum.");
        errors.ThrowIfAny();
    }
}
