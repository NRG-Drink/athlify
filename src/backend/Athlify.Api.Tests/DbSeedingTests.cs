using Athlify.Api.Database;
using Athlify.Api.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Hosting.Internal;
using Microsoft.Extensions.Logging;

namespace Athlify.Api.Tests;

public class DbSeedingTests
{
    private const int OwnerId = 3;

    [Test]
    public async Task SkipsWhenDisabled()
    {
        await using var context = CreateContext();
        var seeder = new RecordingSeeder();

        var ran = DbSeeding.RunIfEnabled(
            seeder, context, OwnerId, new SeedOptions(), Environment(Environments.Development), new CapturingLogger());

        await Assert.That(ran).IsFalse();
        await Assert.That(seeder.Calls).IsEqualTo(0);
    }

    [Test]
    public async Task SeedsWhenEnabled()
    {
        await using var context = CreateContext();
        var seeder = new RecordingSeeder();

        var ran = DbSeeding.RunIfEnabled(
            seeder, context, OwnerId, new SeedOptions { Enabled = true }, Environment(Environments.Development),
            new CapturingLogger());

        await Assert.That(ran).IsTrue();
        await Assert.That(seeder.Calls).IsEqualTo(1);
        await Assert.That(seeder.OwnerId).IsEqualTo(OwnerId);
    }

    [Test]
    [Arguments("Production", LogLevel.Warning)]
    [Arguments("Development", LogLevel.Information)]
    public async Task WarnsOutsideDevelopment(string environmentName, LogLevel expected)
    {
        await using var context = CreateContext();
        var logger = new CapturingLogger();

        DbSeeding.RunIfEnabled(
            new RecordingSeeder(), context, OwnerId, new SeedOptions { Enabled = true }, Environment(environmentName),
            logger);

        await Assert.That(logger.Levels).IsEquivalentTo([expected]);
    }

    [Test]
    public async Task DefaultsToDisabled()
    {
        var configuration = new ConfigurationBuilder().Build();

        var options = configuration.GetSection(SeedOptions.Section).Get<SeedOptions>() ?? new SeedOptions();

        await Assert.That(options.Enabled).IsFalse();
    }

    private static HostingEnvironment Environment(string name) => new() { EnvironmentName = name };

    private static AthlifyDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AthlifyDbContext>()
            .UseInMemoryDatabase($"seeding-tests-{Guid.NewGuid()}")
            .Options;
        return new AthlifyDbContext(options, new FixedCurrentUser());
    }

    private sealed class FixedCurrentUser : ICurrentUser
    {
        public int UserId => OwnerId;
    }

    private sealed class RecordingSeeder : IDbSeeder
    {
        public int Calls { get; private set; }
        public int? OwnerId { get; private set; }

        public void Seed(AthlifyDbContext context, int ownerId)
        {
            Calls++;
            OwnerId = ownerId;
        }
    }

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
