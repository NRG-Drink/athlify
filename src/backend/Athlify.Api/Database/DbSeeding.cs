namespace Athlify.Api.Database;

/// <summary>Decides at startup whether sample data is written.</summary>
public static class DbSeeding
{
    /// <summary>Seeds when <paramref name="options"/> allow it; returns whether the seeder ran.</summary>
    public static bool RunIfEnabled(
        IDbSeeder seeder,
        AthlifyDbContext db,
        int ownerId,
        SeedOptions options,
        IHostEnvironment environment,
        ILogger logger)
    {
        if (!options.Enabled)
        {
            logger.LogInformation("Sample data seeding is disabled ({Setting}=false).", $"{SeedOptions.Section}:Enabled");
            return false;
        }

        // Outside Development sample data lands next to real data, so it should stand out in the log.
        var level = environment.IsDevelopment() ? LogLevel.Information : LogLevel.Warning;
        logger.Log(level, "Seeding sample data for user {UserId} in {Environment}.", ownerId, environment.EnvironmentName);
        seeder.Seed(db, ownerId);
        return true;
    }
}
