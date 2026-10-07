using Athlify.Api.Domain.Body;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Database;

public class DbSeeder : IDbSeeder
{
    public void Seed(AthlifyDbContext context, int ownerId)
    {
        if (!context.BodyStats.IgnoreQueryFilters([AthlifyDbContext.OwnerFilter]).Any(b => b.UserId == ownerId))
        {
            var bodyStats = new List<BodyStats>
            {
                new() {
                    UserId = ownerId,
                    Date = DateTime.UtcNow.AddDays(-1),
                    Weight = 70.5,
                    BodyFatPercentage = 15.2,
                    MusclePercentage = 40.3,
                    WaterPercentage = 60.1,
                    BoneMass = 3.2,
                    Comment = "Feeling good today!"
                },
                new() {
                    UserId = ownerId,
                    Date = DateTime.UtcNow.AddDays(-2),
                    Weight = 71.0,
                    BodyFatPercentage = 15.5,
                    MusclePercentage = 40.0,
                    WaterPercentage = 59.8,
                    BoneMass = 3.1,
                    Comment = "A bit tired today."
                },
                new()
                {
                    UserId = ownerId,
                    Date = DateTime.UtcNow.AddDays(-3),
                    Weight = 71.2,
                    BodyFatPercentage = 15.3,
                    MusclePercentage = 40.2,
                    WaterPercentage = 60.0,
                    BoneMass = 3.3,
                    Comment = "Feeling strong!"
                }
            };
            context.BodyStats.AddRange(bodyStats);
            context.SaveChanges();
        }
    }
}
