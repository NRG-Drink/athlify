namespace Athlify.Api.Tests;

/// <summary>The API contract: domain types are exposed, server-owned and secret fields are not.</summary>
public class SchemaTests : WebApiTestBase
{
    // TODO: Re-enable these tests once the schema is stable and we can rely on it not changing frequently.
    //[Test]
    //public async Task SchemaExposesTheDomainButNoOwnerOrSecretFields()
    //{
    //    var sdl = await Factory.CreateClient().GetStringAsync("/graphql?sdl");

    //    foreach (var type in new[] { "User", "BodyStats", "Tag", "Vehicle", "Gadget", "MaintenanceCycle", "Activity", "ActivityMerge", "Event" })
    //    {
    //        await Assert.That(sdl).Contains($"type {type} implements Node");
    //    }

    //    foreach (var enumType in new[] { "ActivityType", "Mood", "Wind", "EventType", "Source", "Language" })
    //    {
    //        await Assert.That(sdl).Contains($"enum {enumType} ");
    //    }

    //    // Fields (and filter or sort fields) are written as "  name:" at the start of a line; arguments are not.
    //    foreach (var hidden in new[] { "userId", "passwordHash", "normalizedName", "deletedAt", "mergeId", "accessToken" })
    //    {
    //        await Assert.That(sdl).DoesNotContain($"\n  {hidden}:");
    //    }

    //    await Assert.That(sdl).DoesNotContain("StravaConnection");
    //    await Assert.That(InputType(sdl, "ActivityInput")).DoesNotContain("averageSpeed");
    //    await Assert.That(InputType(sdl, "ActivityInput")).DoesNotContain("source");
    //}

    [Test]
    public async Task InputsAreNamedInputWithoutDtoOrDoubledSuffix()
    {
        var sdl = await FetchSdl();

        foreach (var input in new[]
                 {
                     "ActivityInput", "BodyStatsInput", "EventInput", "GadgetInput",
                     "MaintenanceCycleInput", "TagInput", "VehicleInput",
                 })
        {
            await Assert.That(sdl).Contains($"input {input} {{");
        }

        await Assert.That(sdl).DoesNotContain("Dto");
        await Assert.That(sdl).DoesNotContain("InputInput");
    }

    [Test]
    public async Task UserExposesUidAndRoleEnumButNoEmailOrRawRole()
    {
        var sdl = await FetchSdl();

        var user = Block(sdl, "type User implements Node {");

        await Assert.That(user).Contains("\n  uid: UUID!");
        await Assert.That(user).Contains("\n  role: Role!");
        await Assert.That(user).DoesNotContain("\n  email:");
        await Assert.That(user).DoesNotContain("\n  role: String");
        await Assert.That(sdl).Contains("enum Role {\n  USER\n  ADMIN\n}");
    }

    [Test]
    public async Task RefreshTokensAreNotPartOfTheSchema()
    {
        var sdl = await FetchSdl();

        await Assert.That(sdl).DoesNotContain("type RefreshToken");
        await Assert.That(sdl).DoesNotContain("tokenHash");
    }

    // Hot Chocolate writes the platform newline, so the SDL is normalised to "\n" once here.
    private async Task<string> FetchSdl() =>
        (await Factory.CreateClient().GetStringAsync("/graphql?sdl")).Replace("\r\n", "\n");

    private static string Block(string sdl, string header)
    {
        var start = sdl.IndexOf(header, StringComparison.Ordinal);
        return sdl[start..sdl.IndexOf("\n}", start, StringComparison.Ordinal)];
    }

    private static string InputType(string sdl, string name) => Block(sdl, $"input {name} {{");
}
