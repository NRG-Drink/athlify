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
    [Arguments(20261126, 400)]
    [Arguments(20261126, 2000)]
    public async Task InsertsRealisticBodyStats(int seed, int numberOfEntries)
    {
        if (numberOfEntries < 1)
        {
            throw new ArgumentOutOfRangeException(nameof(numberOfEntries), "At least one Body-Stats entry must be inserted.");
        }

        var random = new Randomizer(seed);
        var today = DateTime.UtcNow.Date;
        var measurementTimes = CreateMeasurementTimes(random, today, numberOfEntries);

        var weight = 72.0;
        var bodyFat = 16.0;
        var muscle = 40.0;
        var water = 60.0;
        var boneMass = 3.2;
        var entries = new List<BodyStats>();
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

        database.Context.BodyStats.AddRange(entries);
        await database.Context.SaveChangesAsync();

        var ids = entries.Select(bodyStats => bodyStats.Id).ToArray();
        var persistedEntries = await database.Context.BodyStats
            .AsNoTracking()
            .Where(bodyStats => ids.Contains(bodyStats.Id))
            .ToListAsync();

        await Assert.That(persistedEntries.Count).IsEqualTo(numberOfEntries);
        await Assert.That(persistedEntries.All(bodyStats => bodyStats.Date < today)).IsTrue();
    }

    [Test, Explicit]
    public async Task ClearsBodyStats()
    {
        await database.Context.BodyStats.ExecuteDeleteAsync();

        await Assert.That(await database.Context.BodyStats.CountAsync()).IsEqualTo(0);
    }

    /// <summary>
    /// Walks back from yesterday until the requested number of measurements exists: some days are skipped, some
    /// start a gap of several days, and some have a second measurement in the evening. Returned oldest first.
    /// </summary>
    private static List<DateTime> CreateMeasurementTimes(Randomizer random, DateTime today, int numberOfEntries)
    {
        var times = new List<DateTime>();
        var day = today.AddDays(-1);
        while (times.Count < numberOfEntries)
        {
            if (random.Bool(0.06f))
            {
                day = day.AddDays(-random.Int(2, 6));
                continue;
            }

            if (!random.Bool(0.15f))
            {
                times.Add(day.AddHours(random.Double(5.5, 10)));
                if (times.Count < numberOfEntries && random.Bool(0.15f))
                {
                    times.Add(day.AddHours(random.Double(17, 22.5)));
                }
            }

            day = day.AddDays(-1);
        }

        times.Sort();
        return times;
    }
}
