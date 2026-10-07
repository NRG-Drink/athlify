namespace Athlify.Api.Tests;

/// <summary>The API contract: domain types are exposed, server-owned and secret fields are not.</summary>
public class SchemaTests : WebApiTestBase
{
    [Test]
    public async Task SchemaExposesTheDomainButNoOwnerOrSecretFields()
    {
        var sdl = await Factory.CreateClient().GetStringAsync("/graphql?sdl");

        foreach (var type in new[] { "User", "BodyStats", "Tag", "Vehicle", "Gadget", "MaintenanceCycle", "Activity", "ActivityMerge", "Event" })
        {
            await Assert.That(sdl).Contains($"type {type} implements Node");
        }

        foreach (var enumType in new[] { "ActivityType", "Mood", "Wind", "EventType", "Source", "Role", "Language" })
        {
            await Assert.That(sdl).Contains($"enum {enumType} ");
        }

        // Fields (and filter or sort fields) are written as "  name:" at the start of a line; arguments are not.
        foreach (var hidden in new[] { "userId", "passwordHash", "normalizedName", "deletedAt", "mergeId", "accessToken" })
        {
            await Assert.That(sdl).DoesNotContain($"\n  {hidden}:");
        }

        await Assert.That(sdl).DoesNotContain("StravaConnection");
        await Assert.That(InputType(sdl, "ActivityDtoInput")).DoesNotContain("averageSpeed");
        await Assert.That(InputType(sdl, "ActivityDtoInput")).DoesNotContain("source");
    }

    private static string InputType(string sdl, string name)
    {
        var start = sdl.IndexOf($"input {name} {{", StringComparison.Ordinal);
        return sdl[start..sdl.IndexOf("\n}", start, StringComparison.Ordinal)];
    }
}
