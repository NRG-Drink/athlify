using Athlify.Api.Domain.Body;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Database;

public class DbSeeder : IDbSeeder
{
    private const int SampleDays = 365;

    public void Seed(AthlifyDbContext context, int ownerId)
    {
        var existingDates = context.BodyStats
            .IgnoreQueryFilters([AthlifyDbContext.OwnerFilter])
            .Where(b => b.UserId == ownerId)
            .Select(b => b.Date.Date)
            .ToHashSet();

        var today = DateTime.UtcNow.Date;
        var bodyStats = Enumerable.Range(1, SampleDays)
            .Select(daysAgo => today.AddDays(-daysAgo))
            .Where(date => !existingDates.Contains(date))
            .Select(CreateSample)
            .ToList();

        if (bodyStats.Count > 0)
        {
            foreach (var sample in bodyStats)
                sample.UserId = ownerId;

            context.BodyStats.AddRange(bodyStats);
            context.SaveChanges();
        }
    }

    private static BodyStats CreateSample(DateTime date)
    {
        var daysAgo = (DateTime.UtcNow.Date - date).Days;
        var trend = daysAgo / 365d;

        return new BodyStats
        {
            Date = date,
            Weight = Math.Round(70.5 + trend * 2.5 + Math.Sin(daysAgo / 8d) * 0.35, 1),
            BodyFatPercentage = Math.Round(15.2 + trend * 1.1 + Math.Sin(daysAgo / 11d) * 0.25, 1),
            MusclePercentage = Math.Round(40.3 - trend * 0.8 + Math.Cos(daysAgo / 13d) * 0.2, 1),
            WaterPercentage = Math.Round(60.1 - trend * 0.6 + Math.Sin(daysAgo / 10d) * 0.3, 1),
            BoneMass = Math.Round(3.2 + Math.Cos(daysAgo / 17d) * 0.1, 1)
        };
    }
}
