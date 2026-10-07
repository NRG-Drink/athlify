using Athlify.Api.Database;
using Athlify.Api.Domain.Users;
using Microsoft.EntityFrameworkCore;

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

        var developmentUserOptions = builder.Configuration.GetSection(DevelopmentUserOptions.Section)
            .Get<DevelopmentUserOptions>() ?? new DevelopmentUserOptions();
        builder.Services.AddSingleton<DevelopmentCurrentUser>();
        builder.Services.AddScoped<ICurrentUser>(sp => sp.GetRequiredService<DevelopmentCurrentUser>());
        builder.Services.AddHttpContextAccessor();

        // Not pooled: the context takes the scoped ICurrentUser for its owner query filter, and a pooled
        // context would keep the user of an earlier request. EnrichNpgsqlDbContext keeps Aspire's retries,
        // health check and telemetry that AddNpgsqlDbContext would add.
        builder.Services.AddDbContext<AthlifyDbContext>(options =>
            options.UseNpgsql(builder.Configuration.GetConnectionString("postgres-db")));
        builder.EnrichNpgsqlDbContext<AthlifyDbContext>();

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
            })
            // The defaults (1000) target public APIs: a filtered page of 200 activities passed as a variable,
            // as Relay does, already costs about 6600. Pages are capped at 200 and every request is a user's own.
            .ModifyCostOptions(options =>
            {
                options.MaxFieldCost = 10_000;
                options.MaxTypeCost = 10_000;
            });

        var app = builder.Build();
        {
            await using var scope = app.Services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AthlifyDbContext>();
            if (db.Database.IsRelational())
            {
                await db.Database.MigrateAsync();
            }
            else
            {
                await db.Database.EnsureCreatedAsync();
            }

            var developmentUserId = await DevelopmentUserProvisioner.EnsureAsync(db, developmentUserOptions);
            app.Services.GetRequiredService<DevelopmentCurrentUser>().UserId = developmentUserId;

            var seeder = scope.ServiceProvider.GetRequiredService<IDbSeeder>();
            seeder.Seed(db, developmentUserId);
        }

        app.UseCors("FrontendDev");

        app.MapGraphQL();

        app.RunWithGraphQLCommands(args);
    }
}
