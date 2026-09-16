using Athlify.Api.Database;
using Athlify.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

/* Created using the following sources
 * YouTube: https://www.youtube.com/watch?v=YL07NyBXC7M
 * Docs: https://chillicream.com/docs/hotchocolate/v13/get-started
 */
public partial class Program
{
    private static async Task Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        builder.Configuration.AddJsonFile("appsettings.json", optional: true);
        builder.Services.AddSingleton<IDbSeeder, DbSeeder>();
        builder.Services.AddDbContext<InMemoryDb>(options =>
        {
            options
                .UseInMemoryDatabase("InMemoryDb")
                //.LogTo(Console.WriteLine, LogLevel.Trace)
                .EnableSensitiveDataLogging();
        });

        builder
            .AddGraphQL()
            .AddTypes()
            .AddProjections()
            .AddFiltering()
            .AddSorting();

        var app = builder.Build();
        {
            await using var scope = app.Services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<InMemoryDb>();
            var seeder = scope.ServiceProvider.GetRequiredService<IDbSeeder>();
            seeder.Seed(db);
        }

        app.MapGraphQL();

        app.RunWithGraphQLCommands(args);
    }
}