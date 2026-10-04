using Athlify.Api.Database;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TUnit.AspNetCore;
using TUnit.AspNetCore.Extensions;

namespace Athlify.Api.Tests;

// TUnit Docs: https://tunit.dev/docs/examples/aspnet
public abstract class WebApiTestBase : WebApplicationTest<MyWebApplicationFactory, Program>;

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
        });

        base.ConfigureWebHost(builder);
    }

    // Each factory gets its own database so tests do not need a running PostgreSQL instance.
    private static void UseInMemoryDatabase(IServiceCollection services)
    {
        var registrations = services
            .Where(d => d.ServiceType == typeof(InMemoryDb)
                || d.ServiceType.GenericTypeArguments.Contains(typeof(InMemoryDb)))
            .ToList();
        foreach (var registration in registrations)
        {
            services.Remove(registration);
        }

        var databaseName = $"athlify-tests-{Guid.NewGuid()}";
        services.AddDbContext<InMemoryDb>(options => options.UseInMemoryDatabase(databaseName));
    }
}

public class SeedNothing : IDbSeeder
{
    public void Seed(InMemoryDb context)
    {
    }
}   
