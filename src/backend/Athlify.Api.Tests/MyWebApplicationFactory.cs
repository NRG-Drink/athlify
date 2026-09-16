using Athlify.Api.Database;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
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
        });

        base.ConfigureWebHost(builder);
    }
}

public class SeedNothing : IDbSeeder
{
    public void Seed(InMemoryDb context)
    {
    }
}   
