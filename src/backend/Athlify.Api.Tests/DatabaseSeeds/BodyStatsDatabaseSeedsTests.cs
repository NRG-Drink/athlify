using Athlify.Api.Domain.Body;
using Bogus;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Tests.DatabaseSeeds;

[Category("DatabaseSeed")]
[ClassDataSource<DatabaseSeedsFixture>(Shared = SharedType.None)]
public class BodyStatsSeeds(DatabaseSeedsFixture database)
{
    [Test, Explicit]
    [Arguments(20261126, 365)]
    public async Task InsertsRandomBodyStats(int seed, int numberOfDays)
    {
        if (numberOfDays < 1)
        {
            throw new ArgumentOutOfRangeException(nameof(numberOfDays), "At least one Body-Stats entry must be inserted.");
        }

        var today = DateTime.UtcNow.Date;
        var existingDates = (await database.Context.BodyStats
                .Select(bodyStats => bodyStats.Date)
                .ToListAsync())
            .Select(date => date.Date)
            .ToHashSet();
        var missingDates = Enumerable.Range(1, numberOfDays)
            .Select(daysAgo => today.AddDays(-daysAgo))
            .Where(date => !existingDates.Contains(date))
            .ToList();

        var dayIndex = 0;
        var bodyStatsFaker = new Faker<BodyStats>()
            .UseSeed(seed)
            .RuleFor(bodyStats => bodyStats.UserId, _ => database.OwnerUserId)
            .RuleFor(bodyStats => bodyStats.Date, _ => missingDates[dayIndex++])
            .RuleFor(bodyStats => bodyStats.Weight, (faker, bodyStats) => Trend(bodyStats, faker, 70.5, 2.5, 1.2))
            .RuleFor(bodyStats => bodyStats.BodyFatPercentage, (faker, bodyStats) => Trend(bodyStats, faker, 15.2, 1.1, 0.5))
            .RuleFor(bodyStats => bodyStats.MusclePercentage, (faker, bodyStats) => Trend(bodyStats, faker, 40.3, -0.8, 0.4))
            .RuleFor(bodyStats => bodyStats.WaterPercentage, (faker, bodyStats) => Trend(bodyStats, faker, 60.1, -0.6, 0.6))
            .RuleFor(bodyStats => bodyStats.BoneMass, faker => Math.Round(faker.Random.Double(3.1, 3.3), 1));
        var entries = bodyStatsFaker.Generate(missingDates.Count);

        database.Context.BodyStats.AddRange(entries);
        await database.Context.SaveChangesAsync();

        var ids = entries.Select(bodyStats => bodyStats.Id).ToArray();
        var persistedEntries = await database.Context.BodyStats
            .AsNoTracking()
            .Where(bodyStats => ids.Contains(bodyStats.Id))
            .ToListAsync();

        await Assert.That(persistedEntries.Count).IsEqualTo(missingDates.Count);
        await Assert.That(persistedEntries.Select(bodyStats => bodyStats.Date.Date))
            .IsEquivalentTo(missingDates);
    }

    private static double Trend(BodyStats bodyStats, Faker faker, double start, double yearlyChange, double noise)
    {
        var daysAgo = (DateTime.UtcNow.Date - bodyStats.Date.Date).Days;
        return Math.Round(start + daysAgo / 365d * yearlyChange + faker.Random.Double(-noise, noise) / 2, 1);
    }
}
