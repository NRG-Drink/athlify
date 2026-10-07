using Athlify.Api.Domain.Common;

namespace Athlify.Api.Domain.Activities;

public static class ActivityValidation
{
    public const int MaxDescriptionLength = 2000;
    public const int MinHeartRate = 20;
    public const int MaxHeartRate = 250;

    public static void ThrowIfInvalid(ActivityInput dto, DateTime now)
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
