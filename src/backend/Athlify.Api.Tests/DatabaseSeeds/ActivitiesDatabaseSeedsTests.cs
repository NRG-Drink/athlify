using Athlify.Api.Database;
using Athlify.Api.Domain.Activities;
using Athlify.Api.Domain.Tags;
using Bogus;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Tests.DatabaseSeeds;

[Category("DatabaseSeed")]
[NotInParallel]
[ClassDataSource<DatabaseSeedsFixture>(Shared = SharedType.None)]
public class ActivitySeeds(DatabaseSeedsFixture database)
{
    private static readonly string[] TagNames = ["endurance", "intervals", "commute", "hills"];

    [Test, Explicit]
    [Arguments(20261126, 120)]
    public async Task InsertsRandomActivities(int seed, int numberOfEntries)
    {
        if (numberOfEntries < 2)
        {
            throw new ArgumentOutOfRangeException(nameof(numberOfEntries), "At least two Activities must be inserted.");
        }

        var tags = await GetOrCreateTagsAsync();
        var now = DateTime.UtcNow;
        var activityFaker = new Faker<Activity>()
            .UseSeed(seed)
            .RuleFor(activity => activity.UserId, _ => database.OwnerUserId)
            .RuleFor(activity => activity.Date, faker => DateTime.SpecifyKind(faker.Date.Between(now.AddDays(-730), now.AddDays(-1)), DateTimeKind.Utc))
            .RuleFor(activity => activity.Type, faker => faker.PickRandom(Enum.GetValues<ActivityType>()))
            .RuleFor(activity => activity.Time, faker => faker.Random.Int(1800, 14400))
            .RuleFor(activity => activity.Distance, faker => Math.Round(faker.Random.Double(10, 120), 1))
            .RuleFor(
                activity => activity.ElevationGain,
                (faker, activity) => activity.Type == ActivityType.Indoor ? null : Math.Round(faker.Random.Double(50, 1500)))
            .RuleFor(activity => activity.Description, faker => faker.Lorem.Sentence(4))
            .RuleFor(activity => activity.HeartRateMin, faker => faker.Random.Bool(0.8f) ? faker.Random.Int(95, 115) : null)
            .RuleFor(
                activity => activity.HeartRateAverage,
                (faker, activity) => activity.HeartRateMin is null ? null : faker.Random.Int(125, 150))
            .RuleFor(
                activity => activity.HeartRateMax,
                (faker, activity) => activity.HeartRateMin is null ? null : faker.Random.Int(155, 185))
            .RuleFor(activity => activity.Mood, faker => faker.Random.Bool(0.85f) ? faker.PickRandom(Enum.GetValues<Mood>()) : null)
            .RuleFor(activity => activity.Effort, faker => faker.Random.Bool(0.85f) ? faker.Random.Int(1, 10) : null)
            .RuleFor(
                activity => activity.Wind,
                (faker, activity) => activity.Type == ActivityType.Indoor || faker.Random.Bool(0.15f)
                    ? null
                    : faker.PickRandom(Enum.GetValues<Wind>()))
            .RuleFor(activity => activity.Tags, faker => faker.PickRandom(tags, faker.Random.Int(1, 3)).ToList())
            .FinishWith((_, activity) => activity.Recalculate());
        var activities = activityFaker.Generate(numberOfEntries);

        var merge = new ActivityMerge
        {
            UserId = database.OwnerUserId,
            Name = "Weekend double",
            Activities = activities.Take(2).ToList(),
        };
        new MergeMembership().Refresh(merge, database.Context);
        database.Context.ActivityMerges.Add(merge);

        database.Context.Activities.AddRange(activities);
        await database.Context.SaveChangesAsync();

        var ids = activities.Select(activity => activity.Id).ToArray();
        var persistedActivities = await database.Context.Activities
            .AsNoTracking()
            .Where(activity => ids.Contains(activity.Id))
            .ToListAsync();

        await Assert.That(persistedActivities.Count).IsEqualTo(numberOfEntries);
        await Assert.That(persistedActivities.All(activity => activity.AverageSpeed is not null)).IsTrue();
        await Assert.That(persistedActivities.Count(activity => activity.MergeId == merge.Id)).IsEqualTo(2);
    }

    [Test, Explicit]
    public async Task ClearsActivitiesAndMerges()
    {
        var includeSoftDeleted = new[] { AthlifyDbContext.NotDeletedFilter };
        await database.Context.Activities.IgnoreQueryFilters(includeSoftDeleted).ExecuteDeleteAsync();
        await database.Context.ActivityMerges.IgnoreQueryFilters(includeSoftDeleted).ExecuteDeleteAsync();

        await Assert.That(await database.Context.Activities.IgnoreQueryFilters(includeSoftDeleted).CountAsync()).IsEqualTo(0);
        await Assert.That(await database.Context.ActivityMerges.IgnoreQueryFilters(includeSoftDeleted).CountAsync()).IsEqualTo(0);
    }

    private async Task<List<Tag>> GetOrCreateTagsAsync()
    {
        var normalizedNames = TagNames.Select(Tag.Normalize).ToList();
        var tags = await database.Context.Tags
            .Where(tag => normalizedNames.Contains(tag.NormalizedName))
            .ToListAsync();

        foreach (var name in TagNames.Where(name => tags.All(tag => tag.NormalizedName != Tag.Normalize(name))))
        {
            var tag = new Tag { UserId = database.OwnerUserId, Name = name, NormalizedName = Tag.Normalize(name) };
            database.Context.Tags.Add(tag);
            tags.Add(tag);
        }

        return tags;
    }
}
