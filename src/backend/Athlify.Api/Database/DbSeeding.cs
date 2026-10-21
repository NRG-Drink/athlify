namespace Athlify.Api.Database;

/// <summary>Decides at startup whether sample data is written.</summary>
public static class DbSeeding
{
    /// <summary>Runs <paramref name="seed"/> only when <paramref name="options"/> enable seeding.</summary>
    public static void RunIfEnabled(SeedOptions options, IHostEnvironment environment, ILogger logger, Action seed)
    {
        if (!options.Enabled)
        {
            logger.LogInformation("Sample data seeding is disabled ({Setting}=false).", $"{SeedOptions.Section}:Enabled");
            return;
        }

        // Outside Development sample data lands next to real data, so it should stand out in the log.
        var level = environment.IsDevelopment() ? LogLevel.Information : LogLevel.Warning;
        logger.Log(level, "Seeding sample data in {Environment}.", environment.EnvironmentName);
        seed();
    }
}
