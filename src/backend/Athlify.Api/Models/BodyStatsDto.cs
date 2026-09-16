namespace Athlify.Api.Models;

public record BodyStatsDto
{
    public DateTime Date { get; set; }
    public double Weight { get; set; }
    public double BodyFatPercentage { get; set; }
    public double MusclePercentage { get; set; }
    public double WaterPercentage { get; set; }
    public double BoneMass { get; set; }
    public ICollection<Comment> Comments { get; set; } = [];
}
