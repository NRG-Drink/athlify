using Athlify.Api.Database;
using Athlify.Api.Domain.Users;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using TUnit.AspNetCore;
using TUnit.AspNetCore.Extensions;

namespace Athlify.Api.Tests;

// TUnit Docs: https://tunit.dev/docs/examples/aspnet
public abstract class WebApiTestBase : WebApplicationTest<MyWebApplicationFactory, Program>
{
    /// <summary>
    /// Creates a user in this test's database and returns a client that acts as that user.
    /// <c>Factory.CreateClient()</c> without this helper acts as nobody (<c>NOT_AUTHENTICATED</c>).
    /// </summary>
    protected async Task<HttpClient> CreateUserClientAsync(string email = "luca@example.com", Role role = Role.User)
    {
        int userId;
        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AthlifyDbContext>();
            var user = new User { Email = email, FirstName = "Test", LastName = email, Role = role };
            db.Users.Add(user);
            await db.SaveChangesAsync();
            userId = user.Id;
        }

        var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Add(TestCurrentUser.Header, userId.ToString());
        return client;
    }
}

// https://tunit.dev/docs/examples/aspnet#how-do-i-debug-lifecycle-issues
public class MyWebApplicationFactory : TestWebApplicationFactory<Program>
{
    // Runs before Program.cs (https://tunit.dev/docs/examples/aspnet#why-does-my-test-configuration-not-override-the-factory)
    protected override void ConfigureStartupConfiguration(IConfigurationBuilder configurationBuilder)
    {
        base.ConfigureStartupConfiguration(configurationBuilder);

        // Program.cs registers the DbContext through Aspire, which validates this key at startup.
        // The value is never used to connect: ConfigureWebHost swaps the provider for EF Core InMemory.
        configurationBuilder.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["ConnectionStrings:postgres-db"] = "Host=localhost;Database=unused",
        });
    }

    // Runs after Program.cs (https://tunit.dev/docs/examples/aspnet#why-does-my-test-configuration-not-override-the-factory)
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((context, config) =>
        {
        });

        builder.ConfigureServices(services =>
        {
            services.ReplaceService<IDbSeeder, SeedNothing>();
            UseInMemoryDatabase(services);
            services.RemoveAll<ICurrentUser>();
            services.AddScoped<ICurrentUser, TestCurrentUser>();
        });

        base.ConfigureWebHost(builder);
    }

    // Each factory gets its own database so tests do not need a running PostgreSQL instance.
    private static void UseInMemoryDatabase(IServiceCollection services)
    {
        var registrations = services
            .Where(d => d.ServiceType == typeof(AthlifyDbContext)
                || d.ServiceType.GenericTypeArguments.Contains(typeof(AthlifyDbContext)))
            .ToList();
        foreach (var registration in registrations)
        {
            services.Remove(registration);
        }

        var databaseName = $"athlify-tests-{Guid.NewGuid()}";
        services.AddDbContext<AthlifyDbContext>(options => options.UseInMemoryDatabase(databaseName));
    }
}

public class SeedNothing : IDbSeeder
{
    public void Seed(AthlifyDbContext context, int ownerId)
    {
    }
}

/// <summary>Acts as the user whose id the request sends in <see cref="Header"/>.</summary>
public class TestCurrentUser(IHttpContextAccessor httpContextAccessor) : ICurrentUser
{
    public const string Header = "X-Test-User-Id";

    public int UserId =>
        httpContextAccessor.HttpContext?.Request.Headers[Header] is { Count: 1 } value
        && int.TryParse(value[0], out var id)
            ? id
            : throw Athlify.Api.Domain.Common.DomainErrors.NotAuthenticated();
}   
