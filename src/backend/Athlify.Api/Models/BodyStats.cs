namespace Athlify.Api.Models;

public class BodyStats
{
    public int Id { get; set; }
    public Guid Uid { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ModifiedAt { get; set; } = DateTime.UtcNow;
    public DateTime Date { get; set; }
    public double? Weight { get; set; }
    public double? BodyFatPercentage { get; set; }
    public double? MusclePercentage { get; set; }
    public double? WaterPercentage { get; set; }
    public double? BoneMass { get; set; }
    public ICollection<Comment> Comments { get; set; } = [];
}
