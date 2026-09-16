using System.Runtime.Serialization;

namespace Athlify.Api.Models;

public record BodyStats : BodyStatsDto
{
    public BodyStats() { }

    public BodyStats(BodyStatsDto dto)
    {
        Date = dto.Date;
        Weight = dto.Weight;
        BodyFatPercentage = dto.BodyFatPercentage;
        MusclePercentage = dto.MusclePercentage;
        WaterPercentage = dto.WaterPercentage;
        BoneMass = dto.BoneMass;
        Comments = dto.Comments;
    }

    public int Id { get; set; }
    public Guid Uid { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ModifiedAt { get; set; } = DateTime.UtcNow;
}
