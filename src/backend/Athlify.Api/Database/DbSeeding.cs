namespace Athlify.Api.Database;

/// <summary>Decides at startup whether sample data is written.</summary>
public sealed class DbSeeding
{
    public void RunIfEnabled(SeedOptions options, IHostEnvironment environment, ILogger logger, Action seed)
    {
        if (!options.Enabled)
        {
            logger.LogInformation("Sample data seeding is disabled ({Setting}=false).", $"{SeedOptions.Section}:Enabled");
            return;
        }

        var level = environment.IsDevelopment() ? LogLevel.Information : LogLevel.Warning;
        logger.Log(level, "Seeding sample data in {Environment}.", environment.EnvironmentName);
        seed();
    }
}
