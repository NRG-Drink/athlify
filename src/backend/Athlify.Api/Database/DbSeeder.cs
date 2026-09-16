using Athlify.Api.Models;

namespace Athlify.Api.Database;

public class DbSeeder : IDbSeeder
{
    public void Seed(InMemoryDb context)
    {
        if (!context.BodyStats.Any())
        {
            var bodyStats = new List<BodyStats>
            {
                new() {
                    Date = DateTime.UtcNow.AddDays(-1),
                    Weight = 70.5,
                    BodyFatPercentage = 15.2,
                    MusclePercentage = 40.3,
                    WaterPercentage = 60.1,
                    BoneMass = 3.2,
                    Comments =
                    [
                        new() { Content = "Feeling good today!" },
                        new() { Content = "Had a great workout." }
                    ]
                },
                new() {
                    Date = DateTime.UtcNow.AddDays(-2),
                    Weight = 71.0,
                    BodyFatPercentage = 15.5,
                    MusclePercentage = 40.0,
                    WaterPercentage = 59.8,
                    BoneMass = 3.1,
                    Comments = [new() { Content = "A bit tired today." }]
                },
                new()
                {
                    Date = DateTime.UtcNow.AddDays(-3),
                    Weight = 71.2,
                    BodyFatPercentage = 15.3,
                    MusclePercentage = 40.2,
                    WaterPercentage = 60.0,
                    BoneMass = 3.3,
                    Comments =
                    [
                        new() { Content = "Feeling strong!" },
                        new() { Content = "Feeling fat :(" }
                    ]
                }
            };
            context.BodyStats.AddRange(bodyStats);
            context.SaveChanges();
        }
    }
}
