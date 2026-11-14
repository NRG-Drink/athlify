using Athlify.Api.Database;
using Athlify.Api.Domain.Events;
using Bogus;
using Microsoft.EntityFrameworkCore;
using TUnit.Core;

namespace Athlify.Api.Tests.DatabaseWriteTests;

[ClassDataSource<DatabaseWriteDatabase>(Shared = SharedType.None)]
[Category("DatabaseWrite")]
public class EventsDatabaseWriteTests(DatabaseWriteDatabase database)
{
    [Test, Explicit]
    [Arguments(20261114, 200)]
    public async Task InsertsRandomEvents(int seed, int numberOfEntries)
    {
        if (numberOfEntries < 1)
        {
            throw new ArgumentOutOfRangeException(nameof(numberOfEntries), "At least one Event must be inserted.");
        }

        var eventFaker = new Faker<Event>()
            .UseSeed(seed)
            .RuleFor(databaseEvent => databaseEvent.Uid, faker => faker.Random.Guid())
            .RuleFor(databaseEvent => databaseEvent.Name, faker => faker.Lorem.Sentence(4))
            .RuleFor(databaseEvent => databaseEvent.Type, faker => faker.PickRandom(Enum.GetValues<EventType>()))
            .RuleFor(databaseEvent => databaseEvent.Description, faker => faker.Lorem.Sentence())
            .RuleFor(
                databaseEvent => databaseEvent.StartDate,
                faker => faker.Date.BetweenDateOnly(new DateOnly(2020, 1, 1), new DateOnly(2026, 12, 31)))
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
}
