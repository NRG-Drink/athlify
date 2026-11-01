using Athlify.Api.Database;
using Athlify.Api.Domain.Auth;
using Athlify.Api.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Npgsql;

/* Created using the following sources
 * YouTube: https://www.youtube.com/watch?v=YL07NyBXC7M
 * Docs: https://chillicream.com/docs/hotchocolate/v13/get-started
 */
public partial class Program
{
    private static async Task Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        builder.Services.AddDbContext<AthlifyDbContext>(e => ConfigurePostgresDb(e, builder.Configuration));
        builder.EnrichNpgsqlDbContext<AthlifyDbContext>();

        // GraphQL
        builder.Services
            .AddGraphQLServer()
            .AddAuthorization() // HotChocolate auth
            .AddAthlifyTypes()
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
                options.MaxFieldCost = 10_000_000;
                options.MaxTypeCost = 10_000_000;
            });

        // Allows the local Vite dev server to call the GraphQL endpoint during development.
        builder.Services.AddCors(options =>
        {
            options.AddPolicy("FrontendDev", policy =>
                policy
                    .AllowAnyOrigin()
                    .AllowAnyHeader()
                    .AllowAnyMethod());
        });

        builder.AddAuth();
        var app = builder.Build();
        app.UseAuth();

        if (app.Configuration.GetValue<bool>("Database:AutoMigrate", true))
        {
            await SeedDatabaseAsync(app);
        }

        // Only the local Vite dev server needs cross-origin access; other environments are same-origin.
        if (app.Environment.IsDevelopment())
        {
            app.UseCors("FrontendDev");
            RegisterhealthEndpoints(app);
        }

        app.UseDefaultFiles();
        app.UseStaticFiles();

        app.MapGraphQL();
        app.MapFallbackToFile("index.html");

        app.RunWithGraphQLCommands(args);
    }

    private static void RegisterhealthEndpoints(WebApplication app)
    {
        app.MapGet("/health/live", () => Results.Ok(new { status = "healthy" }));
        app.MapGet("/health/ready", async (
            AthlifyDbContext db,
            ILogger<Program> logger,
            CancellationToken cancellationToken) =>
        {
            try
            {
                return await db.Database.CanConnectAsync(cancellationToken)
                    ? Results.Ok(new { status = "ready" })
                    : Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
            }
            catch (Exception exception) when (!cancellationToken.IsCancellationRequested)
            {
                logger.LogWarning(exception, "Readiness check could not connect to the database.");
                return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
            }
        });
    }

    public static void ConfigurePostgresDb(DbContextOptionsBuilder optionsBuilder, ConfigurationManager config)
    {
        var postgresConnectionString = config
            .GetConnectionString("postgres-db")
            ?? throw new InvalidOperationException("ConnectionStrings:postgres-db is required.");
        var postgresPassword = config.GetValue<string>("POSTGRES_PASSWORD");
        if (!string.IsNullOrEmpty(postgresPassword))
        {
            var connectionBuilder = new NpgsqlConnectionStringBuilder(postgresConnectionString)
            {
                Password = postgresPassword,
            };
            postgresConnectionString = connectionBuilder.ConnectionString;
        }

        optionsBuilder.UseNpgsql(postgresConnectionString);
    }

    private static async Task SeedDatabaseAsync(WebApplication app)
    {
        var seedOptions = app.Configuration.GetSection(SeedOptions.Section).Get<SeedOptions>() ?? new SeedOptions();
        var developmentUserOptions = app.Configuration
        .GetSection(DevelopmentUserOptions.Section)
        .Get<DevelopmentUserOptions>()
        ?? new DevelopmentUserOptions();
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

        var seeder = new DbSeeder();
        seeder.Seed(db, developmentUserId);
    }
}
