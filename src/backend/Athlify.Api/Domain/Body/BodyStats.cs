using Athlify.Api.Domain.Common;

namespace Athlify.Api.Domain.Body;

public class BodyStats : Entity, IOwned
{
    public int UserId { get; set; }

    public DateTime Date { get; set; }
    public double Weight { get; set; }
    public double BodyFatPercentage { get; set; }
    public double MusclePercentage { get; set; }
    public double WaterPercentage { get; set; }
    public double BoneMass { get; set; }

    public string? Comment { get; set; }
}
