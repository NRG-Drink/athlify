using Athlify.Api.Models;
using System.Net.Http.Json;
using System.Text.Json;

namespace Athlify.Api.Tests;

public class BodyStatsQueryTests : WebApiTestBase
{
    private static readonly BodyStatsDto _testBodyStats = new BodyStatsDto
    {
        Date = DateTime.UtcNow,
        Weight = 70.5,
        BodyFatPercentage = 15.2,
        MusclePercentage = 40.0,
        WaterPercentage = 60.0,
    };

    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private static readonly string _bodyStatsProps = $$"""
        {{nameof(BodyStats.Id).ToCamelCase()}}
        {{nameof(BodyStats.CreatedAt).ToCamelCase()}}
        {{nameof(BodyStats.ModifiedAt).ToCamelCase()}}
        {{nameof(BodyStats.Date).ToCamelCase()}}
        {{nameof(BodyStats.Weight).ToCamelCase()}}
        {{nameof(BodyStats.BodyFatPercentage).ToCamelCase()}}
        {{nameof(BodyStats.MusclePercentage).ToCamelCase()}}
        {{nameof(BodyStats.WaterPercentage).ToCamelCase()}}
        {{nameof(BodyStats.BoneMass).ToCamelCase()}}
        {{nameof(BodyStats.Comments).ToCamelCase()}} {
            {{nameof(Comment.Id).ToCamelCase()}}
            {{nameof(Comment.Content).ToCamelCase()}}
            {{nameof(Comment.CreatedAt).ToCamelCase()}}
            {{nameof(Comment.ModifiedAt).ToCamelCase()}}
        }
        """;

    private static readonly string _getBodyStatsQuery = $$"""
        query BodyStats {
            bodyStats { 
                {{_bodyStatsProps}}
            } 
        }
        """;

    [Test]
    public async Task GetBodyStatsBefore()
    {
        var client = Factory.CreateClient();

        var request = new
        {
            query = _getBodyStatsQuery,
        };

        var response = await client.PostAsJsonAsync("/graphql", request);
        response.EnsureSuccessStatusCode();

        using var body = await response.Content.ReadFromJsonAsync<JsonDocument>();
        var bodyStats = body!.RootElement.GetProperty("data").GetProperty("bodyStats");
        Console.WriteLine(bodyStats.ToString());
        await Assert.That(bodyStats).IsNotNull()
            .And.Member(e => e.GetArrayLength(), e => e.IsEqualTo(0));
    }

    [Test]
    [DependsOn(nameof(GetBodyStatsBefore))]
    public async Task AddBodyStats()
    {
        var client = Factory.CreateClient();
        var request = new
        {
            query = $$"""
                mutation AddBodyStats($input: BodyStatsDtoInput!) { 
                    addBodyStats(bodyStats: $input) { 
                        {{_bodyStatsProps}} 
                    } 
                }
                """,
            variables = new { input = _testBodyStats }
        };

        var response = await client.PostAsJsonAsync("/graphql", request);
        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            Assert.Fail($"Request failed with status code: {response.StatusCode}. Content: {errorContent}");
        }

        using var body = await response.Content.ReadFromJsonAsync<JsonDocument>();
        var addedBodyStatsId = body!.RootElement.GetProperty("data").GetProperty("addBodyStats").GetProperty("id").GetInt32();
        Console.WriteLine($"Added BodyStats ID: {addedBodyStatsId}");
        await Assert.That(addedBodyStatsId).IsGreaterThan(0);

        var addedBodyStats = body!.RootElement.GetProperty("data").GetProperty("addBodyStats");
        var addedBodyStatsText = addedBodyStats.GetRawText();
        var addedBodyStatsObj = addedBodyStats.Deserialize<BodyStats>(_jsonSerializerOptions);
        await Assert.That(addedBodyStatsObj).IsNotNull()
            .And.Member(e => e.Weight, e => e.IsEqualTo(_testBodyStats.Weight))
            .And.Member(e => e.BodyFatPercentage, e => e.IsEqualTo(_testBodyStats.BodyFatPercentage))
            .And.Member(e => e.MusclePercentage, e => e.IsEqualTo(_testBodyStats.MusclePercentage))
            .And.Member(e => e.WaterPercentage, e => e.IsEqualTo(_testBodyStats.WaterPercentage));
    }

    [Test]
    [DependsOn(nameof(AddBodyStats))]
    public async Task GetBodyStatsAfter()
    {
        var client = Factory.CreateClient();

        var request = new
        {
            query = _getBodyStatsQuery,
        };

        var response = await client.PostAsJsonAsync("/graphql", request);

        using var body = await response.Content.ReadFromJsonAsync<JsonDocument>();
        var bodyStats = body!.RootElement.GetProperty("data").GetProperty("bodyStats");
        var addedBodyStatsText = bodyStats.GetRawText();
        var addedBodyStatsObjs = bodyStats.Deserialize <BodyStats[]>(_jsonSerializerOptions);
        var addedBodyStatsObj = await Assert.That(addedBodyStatsObjs).HasSingleItem();
        await Assert.That(addedBodyStatsObj).IsNotNull()
            .And.Member(e => e.Weight, e => e.IsEqualTo(_testBodyStats.Weight))
            .And.Member(e => e.BodyFatPercentage, e => e.IsEqualTo(_testBodyStats.BodyFatPercentage))
            .And.Member(e => e.MusclePercentage, e => e.IsEqualTo(_testBodyStats.MusclePercentage))
            .And.Member(e => e.WaterPercentage, e => e.IsEqualTo(_testBodyStats.WaterPercentage));
    }

    [Test]
    [DependsOn(nameof(AddBodyStats))]
    public async Task GetBodyStatById()
    {
        var client = Factory.CreateClient();
        var request = new
        {
            query = $$"""
                query BodyStatsById($id: Int!) {
                    bodyStatsById(id: $id) { 
                        {{_bodyStatsProps}} 
                    } 
                }
                """,
            variables = new { id = 1 }
        };
        var response = await client.PostAsJsonAsync("/graphql", request);
        response.EnsureSuccessStatusCode();
        using var body = await response.Content.ReadFromJsonAsync<JsonDocument>();
        var bodyStatsById = body!.RootElement.GetProperty("data").GetProperty("bodyStatsById");
        var bodyStatsByIdObj = bodyStatsById.Deserialize<BodyStats>(_jsonSerializerOptions);
        await Assert.That(bodyStatsByIdObj).IsNotNull()
            .And.Member(e => e.Weight, e => e.IsEqualTo(_testBodyStats.Weight))
            .And.Member(e => e.BodyFatPercentage, e => e.IsEqualTo(_testBodyStats.BodyFatPercentage))
            .And.Member(e => e.MusclePercentage, e => e.IsEqualTo(_testBodyStats.MusclePercentage))
            .And.Member(e => e.WaterPercentage, e => e.IsEqualTo(_testBodyStats.WaterPercentage));
    }

    [Test]
    [DependsOn(nameof(GetBodyStatsAfter))]
    public async Task UpdateBodyStats()
    {
        var client = Factory.CreateClient();
        var updatedBodyStats = _testBodyStats with { Weight = 66.6 };
        var request = new
        {
            query = $$"""
                mutation UpdateBodyStats($id: Int!, $input: BodyStatsDtoInput!) { 
                    updateBodyStats(id: $id, bodyStats: $input) { 
                        {{_bodyStatsProps}} 
                    } 
                }
                """,
            variables = new { id = 1, input = updatedBodyStats }
        };
        var response = await client.PostAsJsonAsync("/graphql", request);
        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            Assert.Fail($"Request failed with status code: {response.StatusCode}. Content: {errorContent}");
        }

        using var body = await response.Content.ReadFromJsonAsync<JsonDocument>();
        var updatedBodyStatsObj = body!.RootElement.GetProperty("data").GetProperty("updateBodyStats").Deserialize<BodyStats>(_jsonSerializerOptions);
        await Assert.That(updatedBodyStatsObj).IsNotNull()
            .And.Member(e => e.Weight, e => e.IsEqualTo(updatedBodyStats.Weight))
            .And.Member(e => e.BodyFatPercentage, e => e.IsEqualTo(_testBodyStats.BodyFatPercentage))
            .And.Member(e => e.MusclePercentage, e => e.IsEqualTo(_testBodyStats.MusclePercentage))
            .And.Member(e => e.WaterPercentage, e => e.IsEqualTo(_testBodyStats.WaterPercentage));
    }

    [Test]
    [DependsOn(nameof(UpdateBodyStats))]
    public async Task DeleteBodyStats()
    {
        var client = Factory.CreateClient();
        var request = new
        {
            query = $$"""
                mutation DeleteBodyStats($id: Int!) { 
                    deleteBodyStats(id: $id) 
                }
                """,
            variables = new { id = 1 }
        };

        var response = await client.PostAsJsonAsync("/graphql", request);
        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            Assert.Fail($"Request failed with status code: {response.StatusCode}. Content: {errorContent}");
        }

        using var body = await response.Content.ReadFromJsonAsync<JsonDocument>();
        var deleteResult = body!.RootElement.GetProperty("data").GetProperty("deleteBodyStats").GetBoolean();
        await Assert.That(deleteResult).IsTrue();
    }

    [Test]
    [DependsOn(nameof(DeleteBodyStats))]
    public async Task GetBodyStatsAfterDelete()
    {
        var client = Factory.CreateClient();

        var request = new
        {
            query = _getBodyStatsQuery,
        };

        var response = await client.PostAsJsonAsync("/graphql", request);

        using var body = await response.Content.ReadFromJsonAsync<JsonDocument>();
        var bodyStats = body!.RootElement.GetProperty("data").GetProperty("bodyStats");
        var addedBodyStatsObjs = bodyStats.Deserialize <BodyStats[]>(_jsonSerializerOptions);
        await Assert.That(addedBodyStatsObjs).IsEmpty();
    }
}
