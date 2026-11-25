using Athlify.Api.Domain.Common;
using System.Net.Http.Json;
using System.Text.Json;

namespace Athlify.Api.Tests;

/// <summary>A small GraphQL client shared by the endpoint tests.</summary>
public static class GraphQl
{
    public static async Task<JsonElement> PostAsync(HttpClient client, string query, object? variables = null)
    {
        var response = await client.PostAsJsonAsync("/graphql", new { query, variables });
        using var body = await response.Content.ReadFromJsonAsync<JsonDocument>();
        return body!.RootElement.Clone();
    }

    public static async Task<JsonElement> DataAsync(HttpClient client, string query, object? variables = null)
    {
        var root = await PostAsync(client, query, variables);
        if (root.TryGetProperty("errors", out var errors))
        {
            Assert.Fail($"GraphQL request returned errors: {errors.GetRawText()}");
        }

        return root.GetProperty("data");
    }

    public static IReadOnlyList<string> ErrorCodes(JsonElement root) =>
        root.TryGetProperty("errors", out var errors)
            ? errors.EnumerateArray()
                .Select(e => e.TryGetProperty("extensions", out var ext) && ext.TryGetProperty("code", out var code)
                    ? code.GetString() ?? ""
                    : "")
                .ToList()
            : [];

    public static async Task<string> GlobalIdAsync(HttpClient admin, string username)
    {
        var users = (await DataAsync(admin, "query { users { id username } }")).GetProperty("users").EnumerateArray();
        return users.Single(u => u.GetProperty("username").GetString() == username).GetProperty("id").GetString()!;
    }

    public static async Task AssertValidationErrorAsync(JsonElement root, string field)
    {
        await Assert.That(ErrorCodes(root)).Contains(DomainErrors.ValidationCode);
        var fields = root.GetProperty("errors").EnumerateArray()
            .Select(e => e.GetProperty("extensions").TryGetProperty("field", out var f) ? f.GetString() : null);
        await Assert.That(fields).Contains(field);
    }

    public static IReadOnlyList<JsonElement> Nodes(JsonElement data, string field) =>
        data.GetProperty(field).GetProperty("nodes").EnumerateArray().ToList();

    public static bool IsNull(JsonElement element) => element.ValueKind == JsonValueKind.Null;
}
