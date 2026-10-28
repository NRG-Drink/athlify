using Athlify.Api.Database;
using Athlify.Api.Domain.Activities;
using Athlify.Api.Domain.Body;
using Athlify.Api.Domain.Users;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Tests;

public class DbSeederTests
{
    [Test]
    public async Task SeedsActivitiesTagsAndMergeOnlyOnce()
    {
        const int ownerId = 7;
        await using var context = CreateContext(ownerId);
        await AddUserAsync(context, ownerId);

        var seeder = new DbSeeder();
        seeder.Seed(context, ownerId);
        var firstActivityIds = await context.Activities
            .IgnoreQueryFilters()
            .Where(a => a.UserId == ownerId)
            .Select(a => a.Id)
            .ToListAsync();
        var firstTagCount = await context.Tags.IgnoreQueryFilters().CountAsync(t => t.UserId == ownerId);
        var firstMergeCount = await context.ActivityMerges.IgnoreQueryFilters().CountAsync(m => m.UserId == ownerId);

        var seededActivities = await context.Activities
            .IgnoreQueryFilters()
            .Where(a => a.UserId == ownerId)
            .ToListAsync();
        foreach (var activity in seededActivities)
        {
            activity.Description = "Edited by developer";
        }
        await context.SaveChangesAsync();
        seeder.Seed(context, ownerId);

        var activities = await context.Activities
            .IgnoreQueryFilters()
            .Where(a => a.UserId == ownerId)
            .Include(a => a.Tags)
            .ToListAsync();
        var merges = await context.ActivityMerges
            .IgnoreQueryFilters()
            .Where(m => m.UserId == ownerId)
            .Include(m => m.Activities)
            .ToListAsync();

        await Assert.That(activities).Count().IsEqualTo(DbSeeder.BaseActivityCount + DbSeeder.ExtraActivityCount);
        await Assert.That(activities.Select(a => a.Type).Distinct()).Count().IsEqualTo(4);
        await Assert.That(activities.Select(a => a.Id)).IsEquivalentTo(firstActivityIds);
        await Assert.That(activities.All(a => a.Description == "Edited by developer")).IsTrue();
        await Assert.That(activities.Any(a => a.AverageSpeed is not null)).IsTrue();
        await Assert.That(activities.Any(a => a.Effort is null && a.HeartRateAverage is null)).IsTrue();
        await Assert.That(activities.SelectMany(a => a.Tags).Select(t => t.Name).Distinct())
            .IsEquivalentTo(DbSeeder.SampleTagNames);
        await Assert.That(await context.Tags.IgnoreQueryFilters().CountAsync(t => t.UserId == ownerId))
            .IsEqualTo(firstTagCount);
        await Assert.That(await context.ActivityMerges.IgnoreQueryFilters().CountAsync(m => m.UserId == ownerId))
            .IsEqualTo(firstMergeCount);
        await Assert.That(merges).Count().IsEqualTo(1);
        await Assert.That(merges[0].Activities).Count().IsEqualTo(2);
        await Assert.That(merges[0].TotalDistance).IsEqualTo(activities
            .Where(a => merges[0].Activities.Select(m => m.Id).Contains(a.Id))
            .Sum(a => a.Distance));
    }

    [Test]
    public async Task PreservesExistingActivities()
    {
        const int ownerId = 8;
        await using var context = CreateContext(ownerId);
        await AddUserAsync(context, ownerId);
        context.Activities.Add(new Activity
        {
            UserId = ownerId,
            Date = DateTime.UtcNow.AddDays(-2),
            Type = ActivityType.Road,
            Time = 3600,
            Distance = 30,
            Description = "My own ride",
        });
        await context.SaveChangesAsync();

        new DbSeeder().Seed(context, ownerId);

        // The one existing activity plus the full seed.
        await Assert.That(await context.Activities.IgnoreQueryFilters().CountAsync(a => a.UserId == ownerId))
            .IsEqualTo(1 + DbSeeder.BaseActivityCount + DbSeeder.ExtraActivityCount);
        await Assert.That(await context.Activities.IgnoreQueryFilters()
            .AnyAsync(a => a.UserId == ownerId && a.Description == "My own ride")).IsTrue();
    }

    [Test]
    public async Task SeedsBodyStatsOnlyOnce()
    {
        const int ownerId = 9;
        await using var context = CreateContext(ownerId);
        await AddUserAsync(context, ownerId);

        var seeder = new DbSeeder();
        seeder.Seed(context, ownerId);
        var deleted = await context.BodyStats.IgnoreQueryFilters()
            .Where(b => b.UserId == ownerId)
            .OrderBy(b => b.Date)
            .Take(10)
            .ToListAsync();
        context.BodyStats.RemoveRange(deleted);
        await context.SaveChangesAsync();
        seeder.Seed(context, ownerId);

        await Assert.That(await context.BodyStats.IgnoreQueryFilters().CountAsync(b => b.UserId == ownerId))
            .IsEqualTo(355);
        await Assert.That(await context.SeedMarkers.IgnoreQueryFilters()
            .CountAsync(s => s.UserId == ownerId && s.Key == DbSeeder.BodyStatsSeedKey)).IsEqualTo(1);
    }

    [Test]
    public async Task DoesNotRefillBodyStatsAfterMarker()
    {
        const int ownerId = 10;
        await using var context = CreateContext(ownerId);
        await AddUserAsync(context, ownerId);
        context.SeedMarkers.Add(new SeedMarker { UserId = ownerId, Key = DbSeeder.BodyStatsSeedKey });
        await context.SaveChangesAsync();

        new DbSeeder().Seed(context, ownerId);

        await Assert.That(await context.BodyStats.IgnoreQueryFilters().CountAsync(b => b.UserId == ownerId))
            .IsEqualTo(0);
    }

    [Test]
    public async Task AdoptsExistingBodyStatsWithMarker()
    {
        const int ownerId = 11;
        await using var context = CreateContext(ownerId);
        await AddUserAsync(context, ownerId);
        var today = DateTime.UtcNow.Date;
        context.BodyStats.AddRange(Enumerable.Range(1, 5).Select(daysAgo => new BodyStats
        {
            UserId = ownerId,
            Date = today.AddDays(-daysAgo),
            Weight = 80,
            Comment = "My own measurement",
        }));
        await context.SaveChangesAsync();

        new DbSeeder().Seed(context, ownerId);

        var bodyStats = await context.BodyStats.IgnoreQueryFilters().Where(b => b.UserId == ownerId).ToListAsync();
        await Assert.That(bodyStats).Count().IsEqualTo(365);
        await Assert.That(bodyStats.Where(b => b.Comment == "My own measurement").Select(b => b.Weight))
            .IsEquivalentTo([80d, 80d, 80d, 80d, 80d]);
        await Assert.That(await context.SeedMarkers.IgnoreQueryFilters()
            .AnyAsync(s => s.UserId == ownerId && s.Key == DbSeeder.BodyStatsSeedKey)).IsTrue();
    }

    private static async Task AddUserAsync(AthlifyDbContext context, int userId)
    {
        context.Users.Add(new User
        {
            Id = userId,
            Email = $"seed-{userId}@example.com",
            FirstName = "Seed",
            LastName = "User",
            Role = UserRole.User,
        });
        await context.SaveChangesAsync();
    }

    private static AthlifyDbContext CreateContext(int ownerId)
    {
        var options = new DbContextOptionsBuilder<AthlifyDbContext>()
            .UseInMemoryDatabase($"seed-tests-{Guid.NewGuid()}")
            .Options;
        return new AthlifyDbContext(options, new FixedCurrentUser(ownerId));
    }

    private sealed class FixedCurrentUser(int userId) : ICurrentUser
    {
        public int? UserId => userId;
    }
}
