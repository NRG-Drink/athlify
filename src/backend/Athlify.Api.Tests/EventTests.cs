using System.Text.Json;
using Athlify.Api.Domain.Common;
using TUnit.Assertions.Enums;
using static Athlify.Api.Tests.DomainGraphQl;
using static Athlify.Api.Tests.GraphQl;

namespace Athlify.Api.Tests;

public class EventTests : WebApiTestBase
{
    private const string EventFields = "id name type description startDate endDate tags { id name }";

    private static readonly string Create = $$"""
        mutation($input: EventInput!) { createEvent(event: $input) { {{EventFields}} } }
        """;

    private static readonly string Update = $$"""
        mutation($id: ID!, $input: EventInput!) { updateEvent(id: $id, event: $input) { {{EventFields}} } }
        """;

    private const string Delete = "mutation($id: ID!) { deleteEvent(id: $id) }";
    private const string EventsQuery = "query { events { nodes { id name } } }";

    private static object Input(
        string name = "Crash in the descent",
        string type = "CRASH",
        string startDate = "2026-09-12",
        string? endDate = null,
        params string[] tagIds) => new
        {
            name,
            type,
            description = "Wet road",
            startDate,
            endDate,
            tagIds,
        };

    private static async Task<JsonElement> CreateAsync(HttpClient client, object input) =>
        (await DataAsync(client, Create, new { input })).GetProperty("createEvent");

    [Test]
    public async Task CreateUpdateAndDeleteKeepTypeDatesAndTags()
    {
        var client = await CreateUserClientAsync();
        var injury = Id(await CreateTagAsync(client, "injury"));

        var created = await CreateAsync(client, Input(tagIds: [injury]));
        var updated = (await DataAsync(client, Update, new
        {
            id = Id(created),
            input = Input(name: "Collarbone", type: "INJURY", startDate: "2026-09-12", endDate: "2026-10-20"),
        })).GetProperty("updateEvent");
        var deleted = (await DataAsync(client, Delete, new { id = Id(created) })).GetProperty("deleteEvent");

        await Assert.That(created.GetProperty("type").GetString()).IsEqualTo("CRASH");
        await Assert.That(created.GetProperty("startDate").GetString()).IsEqualTo("2026-09-12");
        await Assert.That(IsNull(created.GetProperty("endDate"))).IsTrue();
        await Assert.That(TagNames(created)).IsEquivalentTo(new[] { "injury" });
        await Assert.That(updated.GetProperty("type").GetString()).IsEqualTo("INJURY");
        await Assert.That(updated.GetProperty("endDate").GetString()).IsEqualTo("2026-10-20");
        await Assert.That(TagNames(updated)).IsEmpty();
        await Assert.That(deleted.GetString()).IsEqualTo(Id(created));
        await Assert.That(Nodes(await DataAsync(client, EventsQuery), "events").Count).IsEqualTo(0);
        await Assert.That(Nodes(await DataAsync(client, "query { tags { nodes { id } } }"), "tags").Count).IsEqualTo(1);
    }

    [Test]
    public async Task ListIsLatestStartFirst()
    {
        var client = await CreateUserClientAsync();
        await CreateAsync(client, Input(name: "Spring break", type: "BREAK", startDate: "2026-04-01"));
        await CreateAsync(client, Input(name: "Race goal", type: "GOAL", startDate: "2026-11-15"));
        await CreateAsync(client, Input(name: "New chain", type: "REPAIR", startDate: "2026-07-03"));

        var names = Nodes(await DataAsync(client, EventsQuery), "events").Select(e => e.GetProperty("name").GetString()!).ToList();

        await Assert.That(names).IsEquivalentTo(new[] { "Race goal", "New chain", "Spring break" }, CollectionOrdering.Matching);
    }

    [Test]
    [Arguments(" ", "2026-09-12", null)]
    [Arguments("Crash", "2026-09-12", "2026-09-11")]
    public async Task InvalidValuesAreRejected(string name, string startDate, string? endDate)
    {
        var client = await CreateUserClientAsync();

        var root = await PostAsync(client, Create, new { input = Input(name: name, startDate: startDate, endDate: endDate) });

        await Assert.That(ErrorCodes(root)).Contains(DomainErrors.ValidationCode);
        await Assert.That(Nodes(await DataAsync(client, EventsQuery), "events").Count).IsEqualTo(0);
    }

    [Test]
    public async Task UnknownTypeIsRejected()
    {
        var client = await CreateUserClientAsync();

        var root = await PostAsync(client, Create, new { input = Input(type: "VACATION") });

        await Assert.That(root.TryGetProperty("errors", out _)).IsTrue();
    }

    [Test]
    public async Task ForeignEventsAndTagsBehaveAsMissing()
    {
        var luca = await CreateUserClientAsync();
        var mia = await CreateUserClientAsync("mia@example.com");
        var lucasTag = Id(await CreateTagAsync(luca, "race"));
        var lucasEvent = Id(await CreateAsync(luca, Input()));

        var list = Nodes(await DataAsync(mia, EventsQuery), "events");
        var update = (await DataAsync(mia, Update, new { id = lucasEvent, input = Input() })).GetProperty("updateEvent");
        var delete = (await DataAsync(mia, Delete, new { id = lucasEvent })).GetProperty("deleteEvent");
        var withForeignTag = await PostAsync(mia, Create, new { input = Input(tagIds: [lucasTag]) });

        await Assert.That(list.Count).IsEqualTo(0);
        await Assert.That(IsNull(update)).IsTrue();
        await Assert.That(IsNull(delete)).IsTrue();
        await Assert.That(ErrorCodes(withForeignTag)).Contains(DomainErrors.ValidationCode);
        await Assert.That(Nodes(await DataAsync(luca, EventsQuery), "events").Count).IsEqualTo(1);
    }

    [Test]
    public async Task DeletingATagRemovesItFromEvents()
    {
        var client = await CreateUserClientAsync();
        var tag = Id(await CreateTagAsync(client, "goal"));
        var created = Id(await CreateAsync(client, Input(type: "GOAL", tagIds: [tag])));

        await DataAsync(client, "mutation($id: ID!) { deleteTag(id: $id) }", new { id = tag });

        var node = (await DataAsync(client, $"query($id: ID!) {{ node(id: $id) {{ ... on Event {{ {EventFields} }} }} }}", new { id = created }))
            .GetProperty("node");
        await Assert.That(TagNames(node)).IsEmpty();
    }
}
