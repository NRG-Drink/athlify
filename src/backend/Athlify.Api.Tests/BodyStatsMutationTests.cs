using System.Text.Json;
using static Athlify.Api.Tests.BodyStatsGraphQl;

namespace Athlify.Api.Tests;

public class BodyStatsMutationTests : WebApiTestBase
{
    [Test]
    public async Task AddPersistsMeasurementsAndNotes()
    {
        var client = Factory.CreateClient();

        var added = await AddAsync(client, Input(
            weight: 70.5, bodyFat: 15.2, muscle: 40.3, water: 60.1, boneMass: 3.2,
            comments: [NewComment("felt good")]));

        await Assert.That(added.GetProperty("weight").GetDouble()).IsEqualTo(70.5);
        await Assert.That(added.GetProperty("bodyFatPercentage").GetDouble()).IsEqualTo(15.2);
        await Assert.That(added.GetProperty("musclePercentage").GetDouble()).IsEqualTo(40.3);
        await Assert.That(added.GetProperty("waterPercentage").GetDouble()).IsEqualTo(60.1);
        await Assert.That(added.GetProperty("boneMass").GetDouble()).IsEqualTo(3.2);
        await Assert.That(CommentContents(added)).IsEquivalentTo(new[] { "felt good" });
    }

    [Test]
    public async Task UpdateEditsTheNoteAndSetsModifiedAt()
    {
        var client = Factory.CreateClient();
        var added = await AddAsync(client, Input(comments: [NewComment("first")]));
        var id = added.GetProperty("id").GetString()!;
        var noteId = added.GetProperty("comments").EnumerateArray().Single().GetProperty("id").GetString()!;

        var updated = (await DataAsync(client, UpdateMutation, new
        {
            id,
            input = Input(weight: 68.0, comments: [EditedComment(noteId, "edited")]),
        })).GetProperty("updateBodyStats");

        await Assert.That(updated.GetProperty("weight").GetDouble()).IsEqualTo(68.0);
        await Assert.That(CommentContents(updated)).IsEquivalentTo(new[] { "edited" });
        await Assert.That(updated.GetProperty("modifiedAt").GetDateTime()).IsGreaterThan(added.GetProperty("modifiedAt").GetDateTime());
        // The edited note keeps its identity.
        var keptId = updated.GetProperty("comments").EnumerateArray().Single().GetProperty("id").GetString();
        await Assert.That(keptId).IsEqualTo(noteId);
    }

    [Test]
    public async Task UpdateAddsAndRemovesTheNote()
    {
        var client = Factory.CreateClient();
        var added = await AddAsync(client, Input());
        var id = added.GetProperty("id").GetString()!;

        var withNote = (await DataAsync(client, UpdateMutation, new
        {
            id,
            input = Input(comments: [NewComment("brand new")]),
        })).GetProperty("updateBodyStats");
        var withoutNote = (await DataAsync(client, UpdateMutation, new
        {
            id,
            input = Input(comments: []),
        })).GetProperty("updateBodyStats");

        await Assert.That(CommentContents(withNote)).IsEquivalentTo(new[] { "brand new" });
        await Assert.That(CommentContents(withoutNote)).IsEmpty();
    }

    [Test]
    public async Task UpdateOfAnUnknownEntryReturnsNull()
    {
        var client = Factory.CreateClient();
        var added = await AddAsync(client, Input());
        var id = added.GetProperty("id").GetString()!;
        await DataAsync(client, DeleteMutation, new { id });

        var data = await DataAsync(client, UpdateMutation, new { id, input = Input() });

        await Assert.That(data.GetProperty("updateBodyStats").ValueKind).IsEqualTo(JsonValueKind.Null);
    }

    [Test]
    public async Task DeleteReturnsTheIdAndIsIdempotent()
    {
        var client = Factory.CreateClient();
        var added = await AddAsync(client, Input(comments: [NewComment("goes with it")]));
        var id = added.GetProperty("id").GetString()!;

        var first = (await DataAsync(client, DeleteMutation, new { id })).GetProperty("deleteBodyStats");
        var second = (await DataAsync(client, DeleteMutation, new { id })).GetProperty("deleteBodyStats");
        var remaining = (await DataAsync(client, ListQuery)).GetProperty("bodyStats");

        await Assert.That(first.GetString()).IsEqualTo(id);
        await Assert.That(second.ValueKind).IsEqualTo(JsonValueKind.Null);
        await Assert.That(remaining.GetArrayLength()).IsEqualTo(0);
    }

    [Test]
    [Arguments(0.0, 15.0, 40.0, 60.0, 3.2, "")]
    [Arguments(70.0, 15.0, 40.0, 60.0, 0.0, "")]
    [Arguments(70.0, -1.0, 40.0, 60.0, 3.2, "")]
    [Arguments(70.0, 15.0, 101.0, 60.0, 3.2, "")]
    [Arguments(70.0, 15.0, 40.0, 100.5, 3.2, "")]
    [Arguments(70.0, 15.0, 40.0, 60.0, 3.2, "   ")]
    public async Task InvalidInputIsRejectedAndNothingIsPersisted(
        double weight, double bodyFat, double muscle, double water, double boneMass, string note)
    {
        var client = Factory.CreateClient();
        object[] comments = note == "" ? [] : [NewComment(note)];

        var root = await PostAsync(client, AddMutation, new
        {
            input = Input(weight: weight, bodyFat: bodyFat, muscle: muscle, water: water, boneMass: boneMass, comments: comments),
        });

        await Assert.That(root.TryGetProperty("errors", out _)).IsTrue();
        var listed = (await DataAsync(client, ListQuery)).GetProperty("bodyStats");
        await Assert.That(listed.GetArrayLength()).IsEqualTo(0);
    }

    [Test]
    public async Task OverlongNoteIsRejected()
    {
        var client = Factory.CreateClient();

        var root = await PostAsync(client, AddMutation, new
        {
            input = Input(comments: [NewComment(new string('x', 2001))]),
        });

        await Assert.That(root.TryGetProperty("errors", out _)).IsTrue();
    }

    [Test]
    public async Task MoreThanOneNoteIsRejected()
    {
        var client = Factory.CreateClient();

        var root = await PostAsync(client, AddMutation, new
        {
            input = Input(comments: [NewComment("one"), NewComment("two")]),
        });

        await Assert.That(root.TryGetProperty("errors", out _)).IsTrue();
        var listed = (await DataAsync(client, ListQuery)).GetProperty("bodyStats");
        await Assert.That(listed.GetArrayLength()).IsEqualTo(0);
    }

    [Test]
    public async Task UpdateWithANoteOfAnotherEntryIsRejected()
    {
        var client = Factory.CreateClient();
        var first = await AddAsync(client, Input());
        var second = await AddAsync(client, Input(comments: [NewComment("foreign")]));
        var foreignNoteId = second.GetProperty("comments").EnumerateArray().Single().GetProperty("id").GetString()!;

        var root = await PostAsync(client, UpdateMutation, new
        {
            id = first.GetProperty("id").GetString(),
            input = Input(comments: [EditedComment(foreignNoteId, "hijacked")]),
        });

        await Assert.That(root.TryGetProperty("errors", out _)).IsTrue();
    }
}
