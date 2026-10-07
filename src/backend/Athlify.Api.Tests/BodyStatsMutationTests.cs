using System.Text.Json;
using static Athlify.Api.Tests.BodyStatsGraphQl;
using static Athlify.Api.Tests.GraphQl;

namespace Athlify.Api.Tests;

public class BodyStatsMutationTests : WebApiTestBase
{
    [Test]
    public async Task AddPersistsMeasurementsAndNotes()
    {
        var client = await CreateUserClientAsync();

        var added = await AddAsync(client, Input(
            weight: 70.5, bodyFat: 15.2, muscle: 40.3, water: 60.1, boneMass: 3.2,
            comment: "felt good"));

        await Assert.That(added.GetProperty("weight").GetDouble()).IsEqualTo(70.5);
        await Assert.That(added.GetProperty("bodyFatPercentage").GetDouble()).IsEqualTo(15.2);
        await Assert.That(added.GetProperty("musclePercentage").GetDouble()).IsEqualTo(40.3);
        await Assert.That(added.GetProperty("waterPercentage").GetDouble()).IsEqualTo(60.1);
        await Assert.That(added.GetProperty("boneMass").GetDouble()).IsEqualTo(3.2);
        await Assert.That(added.GetProperty("comment").GetString()).IsEqualTo("felt good");
    }

    [Test]
    public async Task UpdateEditsTheNoteAndSetsModifiedAt()
    {
        var client = await CreateUserClientAsync();
        var added = await AddAsync(client, Input(comment: "first"));
        var id = added.GetProperty("id").GetString()!;

        var updated = (await DataAsync(client, UpdateMutation, new
        {
            id,
            input = Input(weight: 68.0, comment: "edited"),
        })).GetProperty("updateBodyStats");

        await Assert.That(updated.GetProperty("weight").GetDouble()).IsEqualTo(68.0);
        await Assert.That(updated.GetProperty("comment").GetString()).IsEqualTo("edited");
        await Assert.That(updated.GetProperty("modifiedAt").GetDateTime()).IsGreaterThan(added.GetProperty("modifiedAt").GetDateTime());
    }

    [Test]
    public async Task UpdateAddsAndRemovesTheNote()
    {
        var client = await CreateUserClientAsync();
        var added = await AddAsync(client, Input());
        var id = added.GetProperty("id").GetString()!;

        var withNote = (await DataAsync(client, UpdateMutation, new
        {
            id,
            input = Input(comment: "brand new"),
        })).GetProperty("updateBodyStats");
        var withoutNote = (await DataAsync(client, UpdateMutation, new
        {
            id,
            input = Input(comment: "   "),
        })).GetProperty("updateBodyStats");

        await Assert.That(withNote.GetProperty("comment").GetString()).IsEqualTo("brand new");
        await Assert.That(withoutNote.GetProperty("comment").ValueKind).IsEqualTo(JsonValueKind.Null);
    }

    [Test]
    public async Task UpdateOfAnUnknownEntryReturnsNull()
    {
        var client = await CreateUserClientAsync();
        var added = await AddAsync(client, Input());
        var id = added.GetProperty("id").GetString()!;
        await DataAsync(client, DeleteMutation, new { id });

        var data = await DataAsync(client, UpdateMutation, new { id, input = Input() });

        await Assert.That(data.GetProperty("updateBodyStats").ValueKind).IsEqualTo(JsonValueKind.Null);
    }

    [Test]
    public async Task DeleteReturnsTheIdAndIsIdempotent()
    {
        var client = await CreateUserClientAsync();
        var added = await AddAsync(client, Input(comment: "goes with it"));
        var id = added.GetProperty("id").GetString()!;

        var first = (await DataAsync(client, DeleteMutation, new { id })).GetProperty("deleteBodyStats");
        var second = (await DataAsync(client, DeleteMutation, new { id })).GetProperty("deleteBodyStats");
        var remaining = (await DataAsync(client, ListQuery)).GetProperty("bodyStats").GetProperty("nodes");

        await Assert.That(first.GetString()).IsEqualTo(id);
        await Assert.That(second.ValueKind).IsEqualTo(JsonValueKind.Null);
        await Assert.That(remaining.GetArrayLength()).IsEqualTo(0);
    }

    [Test]
    [Arguments(0.0, 15.0, 40.0, 60.0, 3.2)]
    [Arguments(70.0, 15.0, 40.0, 60.0, 0.0)]
    [Arguments(70.0, -1.0, 40.0, 60.0, 3.2)]
    [Arguments(70.0, 15.0, 101.0, 60.0, 3.2)]
    [Arguments(70.0, 15.0, 40.0, 100.5, 3.2)]
    public async Task InvalidInputIsRejectedAndNothingIsPersisted(
        double weight, double bodyFat, double muscle, double water, double boneMass)
    {
        var client = await CreateUserClientAsync();

        var root = await PostAsync(client, AddMutation, new
        {
            input = Input(weight: weight, bodyFat: bodyFat, muscle: muscle, water: water, boneMass: boneMass),
        });

        await Assert.That(root.TryGetProperty("errors", out _)).IsTrue();
        var listed = (await DataAsync(client, ListQuery)).GetProperty("bodyStats").GetProperty("nodes");
        await Assert.That(listed.GetArrayLength()).IsEqualTo(0);
    }

    [Test]
    public async Task OverlongNoteIsRejected()
    {
        var client = await CreateUserClientAsync();

        var root = await PostAsync(client, AddMutation, new
        {
            input = Input(comment: new string('x', 2001)),
        });

        await Assert.That(root.TryGetProperty("errors", out _)).IsTrue();
    }
}
