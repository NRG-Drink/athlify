using System.Net.Http.Json;
using System.Text.Json;
using TUnit.Assertions.Conditions;

namespace Athlify.Api.Tests;

[Category("Auth")]
[Explicit]
public class AuthUtilTests
{
    [Test]
    [Arguments("http://localhost:5095/auth/login", "admin", "admin")]
    public async Task Login(string url, string username, string password)
    {
        using var client = new HttpClient();

        using var response = await client.PostAsJsonAsync(url, new { username = username, password = password });
        var responseText = await response.Content.ReadAsStringAsync();
        if (!response.IsOk())
        {
            Console.WriteLine(response.StatusCode);
            Console.WriteLine(responseText);
            Assert.Fail("Login request failed");
        }

        using var responseDocument = JsonDocument.Parse(responseText);
        var token = responseDocument.RootElement.GetProperty("token").GetString();
        await Assert.That(token is { Length: > 0 }).IsTrue();
        Console.WriteLine("Access Token:");
        Console.WriteLine(token);
    }

    [Test]
    [Arguments("http://localhost:5095/graphql")]
    public async Task Hello(string url)
    {
        using var client = new HttpClient();
        using var response = await client.PostAsJsonAsync(url, new
        {
            query = """
                query {
                    helloWorld {
                        hello
                        timestamp
                    }
                }
                """
        });

        if (!response.IsOk())
        {
            Console.WriteLine(response.StatusCode);
            Assert.Fail("Response Status not OK");
        }

        var responseBody = await response.Content.ReadFromJsonAsync<JsonElement>();
        await Assert.That(responseBody.TryGetProperty("errors", out _)).IsFalse();
        await Assert.That(responseBody.GetProperty("data").GetProperty("helloWorld").GetProperty("hello").GetString())
            .IsEqualTo("Hello World!");
    }
}
