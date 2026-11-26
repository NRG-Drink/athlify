using Athlify.Api.Database;
using Athlify.Api.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using TUnit.Core.Interfaces;

namespace Athlify.Api.Tests.DatabaseSeeds;

public sealed class DatabaseSeedsFixture : IAsyncInitializer, IAsyncDisposable
{
    private AthlifyDbContext? context;

    public AthlifyDbContext Context =>
        context ?? throw new InvalidOperationException("The database fixture has not been initialized.");

    /// <summary>The user the seeded rows belong to (<c>Database:OwnerUserId</c>).</summary>
    public int OwnerUserId { get; private set; }

    public async Task InitializeAsync()
    {
        var settingsPath = Path.Combine(AppContext.BaseDirectory, "DatabaseSeeds", "appsettings.json");
        if (!File.Exists(settingsPath))
        {
            throw new FileNotFoundException(
                "Create DatabaseSeeds/appsettings.json from appsettings.example.json and provide a PostgreSQL connection string and owner user ID.",
                settingsPath);
        }

        var configuration = new ConfigurationBuilder()
            .AddJsonFile(settingsPath, optional: false)
            .Build();
        var connectionString = configuration.GetConnectionString("postgres-db");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException("ConnectionStrings:postgres-db is required in DatabaseSeeds/appsettings.json.");
        }

        var ownerUserId = configuration.GetValue<int?>("Database:OwnerUserId");
        if (ownerUserId is null or < 1)
        {
            throw new InvalidOperationException("Database:OwnerUserId must identify an existing database user.");
        }

        var options = new DbContextOptionsBuilder<AthlifyDbContext>()
            .UseNpgsql(connectionString)
            .Options;
        var database = new AthlifyDbContext(options, new DatabaseSeedsTestCurrentUser(ownerUserId.Value));

        try
        {
            if (!await database.Users.IgnoreQueryFilters().AnyAsync(user => user.Id == ownerUserId.Value))
            {
                throw new InvalidOperationException($"No database user exists with ID {ownerUserId.Value}.");
            }

            OwnerUserId = ownerUserId.Value;
            context = database;
        }
        catch
        {
            await database.DisposeAsync();
            throw;
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (context is not null)
        {
            await context.DisposeAsync();
        }
    }

    private sealed class DatabaseSeedsTestCurrentUser(int userId) : ICurrentUser
    {
        public int? UserId => userId;
    }
}
