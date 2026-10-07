using Athlify.Api.Domain.Common;
using HotChocolate.Types.Relay;

namespace Athlify.Api.Domain.Body;

[Node(NodeResolverType = typeof(BodyStatsNode), NodeResolver = nameof(BodyStatsNode.GetAsync))]
public class BodyStats : Entity, IOwned
{
    [GraphQLIgnore]
    public int UserId { get; set; }

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
