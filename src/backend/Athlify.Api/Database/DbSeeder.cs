using Athlify.Api.Domain.Body;
using Athlify.Api.Domain.Activities;
using Athlify.Api.Domain.Tags;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Database;

public class DbSeeder : IDbSeeder
{
    private const int SampleDays = 365;
    private const string ActivitySeedKey = "activities-v1";

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

        SeedActivities(context, ownerId);
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

    private static void SeedActivities(AthlifyDbContext context, int ownerId)
    {
        var alreadySeeded = context.SeedMarkers
            .IgnoreQueryFilters()
            .Any(s => s.UserId == ownerId && s.Key == ActivitySeedKey);
        if (alreadySeeded)
        {
            return;
        }

        var tags = GetOrCreateTags(context, ownerId, ["endurance", "intervals", "commute", "hills"]);
        var today = DateTime.UtcNow.Date;
        var activities = Enumerable.Range(0, 36)
            .Select(index => CreateActivity(index, today, ownerId, tags))
            .ToList();

        context.Activities.AddRange(activities);
        context.SeedMarkers.Add(new SeedMarker { UserId = ownerId, Key = ActivitySeedKey });

        var merge = new ActivityMerge
        {
            UserId = ownerId,
            Name = "Weekend double",
            Activities = activities.Take(2).ToList(),
        };
        MergeMembership.Refresh(merge, context);
        context.ActivityMerges.Add(merge);
        context.SaveChanges();
    }

    private static Dictionary<string, Tag> GetOrCreateTags(
        AthlifyDbContext context,
        int ownerId,
        IReadOnlyList<string> names)
    {
        var normalizedNames = names.ToDictionary(name => Tag.Normalize(name), name => name);
        var tags = context.Tags
            .IgnoreQueryFilters()
            .Where(t => t.UserId == ownerId && normalizedNames.Keys.Contains(t.NormalizedName))
            .ToDictionary(t => t.NormalizedName);

        foreach (var (normalizedName, name) in normalizedNames)
        {
            if (tags.ContainsKey(normalizedName))
            {
                continue;
            }

            var tag = new Tag
            {
                UserId = ownerId,
                Name = name,
                NormalizedName = normalizedName,
            };
            context.Tags.Add(tag);
            tags[normalizedName] = tag;
        }

        return tags;
    }

    private static Activity CreateActivity(
        int index,
        DateTime today,
        int ownerId,
        IReadOnlyDictionary<string, Tag> tags)
    {
        var type = (ActivityType)(index % 4);
        var time = 2400 + index % 6 * 600;
        var distance = Math.Round(18 + index % 8 * 4.5 + (type == ActivityType.Indoor ? 2 : 0), 1);
        var elevation = type == ActivityType.Indoor ? (double?)null : 80 + index % 7 * 55;
        var hasHeartRate = index % 5 != 0;
        var heartRateMin = hasHeartRate ? (int?)(105 + index % 4 * 5) : null;
        var heartRateMax = hasHeartRate ? (int?)(158 + index % 5 * 6) : null;
        var heartRateAverage = hasHeartRate ? (int?)(128 + index % 5 * 5) : null;
        var activity = new Activity
        {
            UserId = ownerId,
            Date = today.AddDays(-(7 + index * 10)).AddHours(6 + index % 4),
            Type = type,
            Time = time,
            Distance = distance,
            ElevationGain = elevation,
            Description = $"Sample {type.ToString().ToLowerInvariant()} ride {index + 1:00}",
            HeartRateMin = heartRateMin,
            HeartRateMax = heartRateMax,
            HeartRateAverage = heartRateAverage,
            Mood = index % 6 == 0 ? null : (Mood)(index % 5),
            Effort = index % 7 == 0 ? null : 3 + index % 8,
            Wind = type == ActivityType.Indoor || index % 6 == 0 ? null : (Wind)(index % 5),
            Tags = [tags["ENDURANCE"], index % 3 == 0 ? tags["INTERVALS"] : tags["COMMUTE"]]
        };
        if (index % 4 == 0)
        {
            activity.Tags.Add(tags["HILLS"]);
        }
        activity.Recalculate();
        return activity;
    }
}
