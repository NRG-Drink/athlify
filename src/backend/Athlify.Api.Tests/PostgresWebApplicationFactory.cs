using Athlify.Api.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using TUnit.AspNetCore;

namespace Athlify.Api.Tests;

/// <summary>
/// Runs the API against a real PostgreSQL server, for the behavior that EF Core InMemory cannot show (serializable
/// transactions). Opt-in: set <see cref="ConnectionVariable"/> to a server connection string whose user may create
/// databases. Without it the tests of this file return early.
/// </summary>
public class PostgresWebApplicationFactory : MyWebApplicationFactory
{
    public const string ConnectionVariable = "ATHLIFY_TEST_POSTGRES";

    private readonly string? _adminConnectionString = Environment.GetEnvironmentVariable(ConnectionVariable);
    private readonly string _databaseName = $"athlify_tests_{Guid.NewGuid():N}";

    /// <summary>True when a PostgreSQL server is configured for this test run.</summary>
    public static bool IsConfigured => Environment.GetEnvironmentVariable(ConnectionVariable) is not null;

    protected override void ConfigureDatabase(IServiceCollection services)
    {
        if (_adminConnectionString is null)
        {
            throw new InvalidOperationException($"Set {ConnectionVariable} to run the PostgreSQL tests.");
        }

        using (var connection = new NpgsqlConnection(_adminConnectionString))
        {
            connection.Open();
            using var command = new NpgsqlCommand($"CREATE DATABASE \"{_databaseName}\"", connection);
            command.ExecuteNonQuery();
        }

        var connectionString = new NpgsqlConnectionStringBuilder(_adminConnectionString) { Database = _databaseName }
            .ConnectionString;
        RemoveDbContextRegistrations(services);
        services.AddDbContext<AthlifyDbContext>(options => // Like the app: EnrichNpgsqlDbContext (Aspire) turns on the retrying execution strategy, which refuses
        // a transaction that code starts itself unless it runs inside the strategy.
        options.UseNpgsql(connectionString, npgsql => npgsql.EnableRetryOnFailure()));
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing && _adminConnectionString is not null)
        {
            using var connection = new NpgsqlConnection(_adminConnectionString);
            connection.Open();
            using var command = new NpgsqlCommand($"DROP DATABASE IF EXISTS \"{_databaseName}\" WITH (FORCE)", connection);
            command.ExecuteNonQuery();
        }
    }
}
