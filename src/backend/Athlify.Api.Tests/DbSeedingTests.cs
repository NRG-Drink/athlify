using Athlify.Api.Database;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Hosting.Internal;
using Microsoft.Extensions.Logging;

namespace Athlify.Api.Tests;

public class DbSeedingTests
{
    [Test]
    public async Task SkipsWhenDisabled()
    {
        var calls = 0;

        DbSeeding.RunIfEnabled(new SeedOptions(), Environment(Environments.Development), new CapturingLogger(), () => calls++);

        await Assert.That(calls).IsEqualTo(0);
    }

    [Test]
    public async Task SeedsWhenEnabled()
    {
        var calls = 0;

        DbSeeding.RunIfEnabled(
            new SeedOptions { Enabled = true }, Environment(Environments.Development), new CapturingLogger(), () => calls++);

        await Assert.That(calls).IsEqualTo(1);
    }

    [Test]
    [Arguments("Production", LogLevel.Warning)]
    [Arguments("Development", LogLevel.Information)]
    public async Task WarnsOutsideDevelopment(string environmentName, LogLevel expected)
    {
        var logger = new CapturingLogger();

        DbSeeding.RunIfEnabled(new SeedOptions { Enabled = true }, Environment(environmentName), logger, () => { });

        await Assert.That(logger.Levels).IsEquivalentTo([expected]);
    }

    private static HostingEnvironment Environment(string name) => new() { EnvironmentName = name };

    private sealed class CapturingLogger : ILogger
    {
        public List<LogLevel> Levels { get; } = [];

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel, EventId eventId, TState state, Exception? exception,
            Func<TState, Exception?, string> formatter) => Levels.Add(logLevel);
    }
}
