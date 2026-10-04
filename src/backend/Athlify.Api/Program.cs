using Athlify.Api.Database;

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


        builder.AddNpgsqlDbContext<InMemoryDb>("postgres-db");

        // Allows the local Vite dev server to call the GraphQL endpoint during development.
        builder.Services.AddCors(options =>
        {
            options.AddPolicy("FrontendDev", policy =>
                policy
                    .AllowAnyOrigin()
                    .AllowAnyHeader()
                    .AllowAnyMethod());
        });

        builder
            .AddGraphQL()
            .AddTypes()
            .AddGlobalObjectIdentification()
            .AddProjections()
            .AddFiltering()
            .AddSorting()
            .ModifyPagingOptions(options =>
            {
                options.DefaultPageSize = 100;
                options.MaxPageSize = 200;
            });

        var app = builder.Build();
        {
            await using var scope = app.Services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<InMemoryDb>();
            await db.Database.EnsureCreatedAsync();
            var seeder = scope.ServiceProvider.GetRequiredService<IDbSeeder>();
            seeder.Seed(db);
        }

        app.UseCors("FrontendDev");

        app.MapGraphQL();

        app.RunWithGraphQLCommands(args);
    }
}