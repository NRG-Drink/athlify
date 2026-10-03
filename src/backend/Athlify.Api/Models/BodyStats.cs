using Athlify.Api.Queries;
using HotChocolate.Types.Relay;

namespace Athlify.Api.Models;

[Node(NodeResolverType = typeof(BodyStatsNode), NodeResolver = nameof(BodyStatsNode.GetAsync))]
public record BodyStats
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
        Comments = dto.Comments.Select(c => new Comment { Content = c.Content }).ToList();
    }

    [ID]
    public int Id { get; set; }
    public Guid Uid { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ModifiedAt { get; set; } = DateTime.UtcNow;
    public DateTime Date { get; set; }
    public double Weight { get; set; }
    public double BodyFatPercentage { get; set; }
    public double MusclePercentage { get; set; }
    public double WaterPercentage { get; set; }
    public double BoneMass { get; set; }

    [UseSorting]
    [UseFiltering]
    public ICollection<Comment> Comments { get; set; } = [];
}
