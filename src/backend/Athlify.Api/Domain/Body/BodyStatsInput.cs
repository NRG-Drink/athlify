namespace Athlify.Api.Domain.Body;

/// <summary>Client input for creating or updating a <see cref="BodyStats"/> entry.</summary>
public record BodyStatsInput
{
    public DateTime Date { get; set; }
    public double Weight { get; set; }
    public double BodyFatPercentage { get; set; }
    public double MusclePercentage { get; set; }
    public double WaterPercentage { get; set; }
    public double BoneMass { get; set; }

    /// <summary>The optional note; null or blank removes it.</summary>
    public string? Comment { get; set; }
}
