using Athlify.Api.Domain.Body;
using Bogus;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Tests.DatabaseSeeds;

[NotInParallel]
[Category("DatabaseSeed")]
[ClassDataSource<DatabaseSeedsFixture>(Shared = SharedType.None)]
public class BodyStatsSeeds(DatabaseSeedsFixture database)
{
    [Test, Explicit]
    [Arguments(20261126, 365)]
    [Arguments(20261126, 2000)]
    public async Task InsertsRealisticBodyStats(int seed, int numberOfDays)
    {
        if (numberOfDays < 1)
        {
            throw new ArgumentOutOfRangeException(nameof(numberOfDays), "At least one day must be covered.");
        }

        var random = new Randomizer(seed);
        var today = DateTime.UtcNow.Date;
        var weight = 72.0;
        var bodyFat = 16.0;
        var muscle = 40.0;
        var water = 60.0;
        var boneMass = 3.2;
        var gapDaysLeft = 0;
        var entries = new List<BodyStats>();

        for (var daysAgo = numberOfDays; daysAgo >= 1; daysAgo--)
        {
            if (gapDaysLeft > 0)
            {
                gapDaysLeft--;
                continue;
            }

            if (random.Bool(0.06f))
            {
                gapDaysLeft = random.Int(2, 6);
                continue;
            }

            if (random.Bool(0.15f))
            {
                continue;
            }

            var day = today.AddDays(-daysAgo);
            var measurementTimes = new List<DateTime> { day.AddHours(random.Double(5.5, 10)) };
            if (random.Bool(0.15f))
            {
                measurementTimes.Add(day.AddHours(random.Double(17, 22.5)));
            }

            foreach (var measurementTime in measurementTimes)
            {
                weight = Math.Clamp(weight + random.Double(-0.6, 0.6), 60, 90);
                bodyFat = Math.Clamp(bodyFat + random.Double(-0.3, 0.3), 8, 30);
                muscle = Math.Clamp(muscle + random.Double(-0.2, 0.2), 30, 50);
                water = Math.Clamp(water + random.Double(-0.4, 0.4), 50, 65);
                boneMass = Math.Clamp(boneMass + random.Double(-0.05, 0.05), 3.0, 3.4);

                entries.Add(new BodyStats
                {
                    UserId = database.OwnerUserId,
                    Date = measurementTime,
                    Weight = Math.Round(weight, 1),
                    BodyFatPercentage = Math.Round(bodyFat, 1),
                    MusclePercentage = Math.Round(muscle, 1),
                    WaterPercentage = Math.Round(water, 1),
                    BoneMass = Math.Round(boneMass, 1),
                });
            }
        }

        database.Context.BodyStats.AddRange(entries);
        await database.Context.SaveChangesAsync();

        var ids = entries.Select(bodyStats => bodyStats.Id).ToArray();
        var persistedEntries = await database.Context.BodyStats
            .AsNoTracking()
            .Where(bodyStats => ids.Contains(bodyStats.Id))
            .ToListAsync();

        await Assert.That(persistedEntries.Count).IsEqualTo(entries.Count);
        await Assert.That(persistedEntries.All(bodyStats =>
            bodyStats.Date >= today.AddDays(-numberOfDays) && bodyStats.Date < today)).IsTrue();
    }

    [Test, Explicit]
    public async Task ClearsBodyStats()
    {
        await database.Context.BodyStats.ExecuteDeleteAsync();

        await Assert.That(await database.Context.BodyStats.CountAsync()).IsEqualTo(0);
    }

    private static double Trend(BodyStats bodyStats, Faker faker, double start, double yearlyChange, double noise)
    {
        var daysAgo = (DateTime.UtcNow.Date - bodyStats.Date.Date).Days;
        return Math.Round(start + daysAgo / 365d * yearlyChange + faker.Random.Double(-noise, noise) / 2, 1);
    }
}
