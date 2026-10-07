using System.Net.Http.Json;
using System.Text.Json;

namespace Athlify.Api.Tests;

/// <summary>A small GraphQL client shared by the endpoint tests.</summary>
public static class GraphQl
{
    /// <summary>Posts a GraphQL document and returns the parsed response (the HTTP status is not asserted).</summary>
    public static async Task<JsonElement> PostAsync(HttpClient client, string query, object? variables = null)
    {
        var response = await client.PostAsJsonAsync("/graphql", new { query, variables });
        using var body = await response.Content.ReadFromJsonAsync<JsonDocument>();
        return body!.RootElement.Clone();
    }

    /// <summary>Posts a GraphQL document and fails the test if the response contains errors.</summary>
    public static async Task<JsonElement> DataAsync(HttpClient client, string query, object? variables = null)
    {
        var root = await PostAsync(client, query, variables);
        if (root.TryGetProperty("errors", out var errors))
        {
            Assert.Fail($"GraphQL request returned errors: {errors.GetRawText()}");
        }

        return root.GetProperty("data");
    }

    /// <summary>The <c>extensions.code</c> of every error in a response; empty when it has none.</summary>
    public static IReadOnlyList<string> ErrorCodes(JsonElement root) =>
        root.TryGetProperty("errors", out var errors)
            ? errors.EnumerateArray()
                .Select(e => e.TryGetProperty("extensions", out var ext) && ext.TryGetProperty("code", out var code)
                    ? code.GetString() ?? ""
                    : "")
                .ToList()
            : [];

    /// <summary>The nodes of a connection field, e.g. <c>Nodes(data, "activities")</c>.</summary>
    public static IReadOnlyList<JsonElement> Nodes(JsonElement data, string field) =>
        data.GetProperty(field).GetProperty("nodes").EnumerateArray().ToList();

    public static bool IsNull(JsonElement element) => element.ValueKind == JsonValueKind.Null;
}
