using System.Text.Json;
using static Athlify.Api.Tests.GraphQl;

namespace Athlify.Api.Tests;

/// <summary>GraphQL documents shared by the Body-Stats endpoint tests.</summary>
public static class BodyStatsGraphQl
{
    public const string Fields = """
        id
        createdAt
        modifiedAt
        date
        weight
        bodyFatPercentage
        musclePercentage
        waterPercentage
        boneMass
        comments { id content createdAt modifiedAt }
        """;

    public static readonly string ListQuery = $$"""
        query { bodyStats(first: 200) { nodes { {{Fields}} } } }
        """;

    public static readonly string NodeQuery = $$"""
        query($id: ID!) { node(id: $id) { ... on BodyStats { {{Fields}} } } }
        """;

    public static readonly string AddMutation = $$"""
        mutation($input: BodyStatsInput!) { addBodyStats(bodyStats: $input) { {{Fields}} } }
        """;

    public static readonly string UpdateMutation = $$"""
        mutation($id: ID!, $input: BodyStatsInput!) { updateBodyStats(id: $id, bodyStats: $input) { {{Fields}} } }
        """;

    public const string DeleteMutation = """
        mutation($id: ID!) { deleteBodyStats(id: $id) }
        """;

    public static object Input(
        DateTime? date = null,
        double weight = 70.5,
        double bodyFat = 15.2,
        double muscle = 40.0,
        double water = 60.0,
        double boneMass = 3.2,
        params object[] comments) => new
        {
            date = date ?? DateTime.UtcNow,
            weight,
            bodyFatPercentage = bodyFat,
            musclePercentage = muscle,
            waterPercentage = water,
            boneMass,
            comments,
        };

    public static object NewComment(string content) => new { content };

    public static object EditedComment(string id, string content) => new { id, content };

    public static async Task<JsonElement> AddAsync(HttpClient client, object input) =>
        (await DataAsync(client, AddMutation, new { input })).GetProperty("addBodyStats");

    public static IReadOnlyList<string> CommentContents(JsonElement bodyStats) =>
        bodyStats.GetProperty("comments").EnumerateArray().Select(c => c.GetProperty("content").GetString()!).ToList();
}
