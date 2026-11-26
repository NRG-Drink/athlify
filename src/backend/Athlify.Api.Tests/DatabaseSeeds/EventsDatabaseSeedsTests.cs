using Athlify.Api.Domain.Events;
using Bogus;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Tests.DatabaseSeeds;

[Category("DatabaseSeed")]
[NotInParallel]
[ClassDataSource<DatabaseSeedsFixture>(Shared = SharedType.None)]
public class EventSeeds(DatabaseSeedsFixture database)
{
    [Test, Explicit]
    [Arguments(20261114, 20)]
    public async Task InsertsRandomEvents(int seed, int numberOfEntries)
    {
        if (numberOfEntries < 1)
        {
            throw new ArgumentOutOfRangeException(nameof(numberOfEntries), "At least one Event must be inserted.");
        }

        var eventFaker = new Faker<Event>()
            .UseSeed(seed)
            .RuleFor(databaseEvent => databaseEvent.Name, faker => faker.Lorem.Sentence(4))
            .RuleFor(databaseEvent => databaseEvent.Type, faker => faker.PickRandom(Enum.GetValues<EventType>()))
            .RuleFor(databaseEvent => databaseEvent.Description, faker => faker.Lorem.Sentence())
            .RuleFor(
                databaseEvent => databaseEvent.StartDate,
                faker => faker.Date.BetweenDateOnly(new DateOnly(2020, 1, 1), DateOnly.FromDateTime(DateTime.UtcNow)))
            .RuleFor(
                databaseEvent => databaseEvent.EndDate,
                (faker, databaseEvent) => faker.Random.Bool()
                    ? databaseEvent.StartDate.AddDays(faker.Random.Int(1, 14))
                    : null);
        var events = eventFaker.Generate(numberOfEntries);

        database.Context.Events.AddRange(events);
        await database.Context.SaveChangesAsync();

        var ids = events.Select(databaseEvent => databaseEvent.Id).ToArray();
        var persistedEvents = await database.Context.Events
            .AsNoTracking()
            .Where(databaseEvent => ids.Contains(databaseEvent.Id))
            .ToListAsync();

        await Assert.That(persistedEvents.Count).IsEqualTo(numberOfEntries);
        await Assert.That(persistedEvents.Select(databaseEvent => databaseEvent.Name))
            .IsEquivalentTo(events.Select(databaseEvent => databaseEvent.Name));
    }

    [Test, Explicit]
    public async Task ClearsEvents()
    {
        await database.Context.Events.ExecuteDeleteAsync();

        await Assert.That(await database.Context.Events.CountAsync()).IsEqualTo(0);
    }
}
