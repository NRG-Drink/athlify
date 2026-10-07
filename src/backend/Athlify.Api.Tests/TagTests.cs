using Athlify.Api.Domain.Common;
using TUnit.Assertions.Enums;
using static Athlify.Api.Tests.DomainGraphQl;
using static Athlify.Api.Tests.GraphQl;

namespace Athlify.Api.Tests;

public class TagTests : WebApiTestBase
{
    private const string TagsQuery = "query { tags { nodes { id name } } }";
    private const string UpdateTag = "mutation($id: ID!, $name: String!) { updateTag(id: $id, tag: { name: $name }) { id name } }";
    private const string DeleteTag = "mutation($id: ID!) { deleteTag(id: $id) }";

    [Test]
    public async Task CreateRenameAndDelete()
    {
        var client = await CreateUserClientAsync();
        var id = Id(await CreateTagAsync(client, "  race  "));

        var renamed = (await DataAsync(client, UpdateTag, new { id, name = "racing" })).GetProperty("updateTag");
        var deleted = (await DataAsync(client, DeleteTag, new { id })).GetProperty("deleteTag");
        var again = (await DataAsync(client, DeleteTag, new { id })).GetProperty("deleteTag");

        await Assert.That(renamed.GetProperty("name").GetString()).IsEqualTo("racing");
        await Assert.That(deleted.GetString()).IsEqualTo(id);
        await Assert.That(IsNull(again)).IsTrue();
        await Assert.That(Nodes(await DataAsync(client, TagsQuery), "tags").Count).IsEqualTo(0);
    }

    [Test]
    public async Task NamesAreTrimmedAndListedAlphabetically()
    {
        var client = await CreateUserClientAsync();
        foreach (var name in new[] { "winter", "  alps ", "race" })
            await CreateTagAsync(client, name);

        var names = Nodes(await DataAsync(client, TagsQuery), "tags").Select(t => t.GetProperty("name").GetString()!).ToList();

        await Assert.That(names).IsEquivalentTo(new[] { "alps", "race", "winter" }, CollectionOrdering.Matching);
    }

    [Test]
    public async Task DuplicateNameIsRejectedIgnoringCaseButAllowedForAnotherUser()
    {
        var luca = await CreateUserClientAsync("luca@example.com");
        var mia = await CreateUserClientAsync("mia@example.com");
        await CreateTagAsync(luca, "Race");
        var other = Id(await CreateTagAsync(luca, "Rain"));

        var duplicate = await PostAsync(luca, "mutation { createTag(tag: { name: \" race \" }) { id } }");
        var renameToDuplicate = await PostAsync(luca, UpdateTag, new { id = other, name = "RACE" });
        var forMia = await CreateTagAsync(mia, "race");

        await Assert.That(ErrorCodes(duplicate)).Contains(DomainErrors.ValidationCode);
        await Assert.That(ErrorCodes(renameToDuplicate)).Contains(DomainErrors.ValidationCode);
        await Assert.That(forMia.GetProperty("name").GetString()).IsEqualTo("race");
    }

    [Test]
    [Arguments("")]
    [Arguments("   ")]
    [Arguments("this tag name is far too long to be a useful label at all")]
    public async Task InvalidNameIsRejected(string name)
    {
        var client = await CreateUserClientAsync();

        var root = await PostAsync(client, "mutation($name: String!) { createTag(tag: { name: $name }) { id } }", new { name });

        await Assert.That(ErrorCodes(root)).Contains(DomainErrors.ValidationCode);
    }

    [Test]
    public async Task DeleteKeepsTaggedRecordsIncludingSoftDeletedActivities()
    {
        var client = await CreateUserClientAsync();
        var tag = Id(await CreateTagAsync(client, "race"));
        var kept = Id(await CreateActivityAsync(client, ActivityInput(tagIds: [tag])));
        var softDeleted = Id(await CreateActivityAsync(client, ActivityInput(tagIds: [tag])));
        var vehicle = Id(await CreateVehicleAsync(client, VehicleInput(tagIds: [tag])));
        await DataAsync(client, DeleteActivityMutation, new { id = softDeleted });

        await DataAsync(client, DeleteTag, new { id = tag });

        var activity = (await DataAsync(client, ActivityNodeQuery, new { id = kept })).GetProperty("node");
        var bike = (await DataAsync(client, "query($id: ID!) { node(id: $id) { ... on Vehicle { tags { id } } } }", new { id = vehicle }))
            .GetProperty("node");
        await Assert.That(TagNames(activity)).IsEmpty();
        await Assert.That(bike.GetProperty("tags").GetArrayLength()).IsEqualTo(0);
    }
}
