using Athlify.Api.Database;
using Athlify.Api.Domain.Auth;
using Athlify.Api.Domain.Users;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Text.Encodings.Web;
using TUnit.AspNetCore;
using TUnit.AspNetCore.Extensions;

namespace Athlify.Api.Tests;

// TUnit Docs: https://tunit.dev/docs/examples/aspnet
public abstract class WebApiTestBase : WebApplicationTest<MyWebApplicationFactory, Program>
{
    /// <summary>
    /// Creates a user in this test's database and returns a client that acts as that user.
    /// <c>Factory.CreateClient()</c> without this helper acts as nobody (<c>NOT_AUTHENTICATED</c>).
    /// </summary>
    protected async Task<HttpClient> CreateUserClientAsync(string username = "luca@example.com", UserRole role = UserRole.User)
    {
        int userId;
        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AthlifyDbContext>();
            var user = new User { Username = username, FirstName = "Test", LastName = username, Role = role };
            db.Users.Add(user);
            await db.SaveChangesAsync();
            userId = user.Id;
        }

        var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Add(TestCurrentUser.Header, userId.ToString());
        client.DefaultRequestHeaders.Add(TestAuthHandler.RoleHeader, role.ToString());
        return client;
    }

    /// <summary>A user by username, read around the owner filter.</summary>
    protected async Task<User> GetUserAsync(string username)
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AthlifyDbContext>();
        return await Factory.Services.GetRequiredService<AdminUsers>().All(db).AsNoTracking().SingleAsync(u => u.Username == username);
    }

    /// <summary>Gives the user a password and returns their id.</summary>
    protected async Task<int> SetPasswordAsync(string username, string password)
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AthlifyDbContext>();
        var user = await Factory.Services.GetRequiredService<AdminUsers>().All(db).SingleAsync(u => u.Username == username);
        user.PasswordHash = scope.ServiceProvider.GetRequiredService<IHashService>().HashPassword(password);
        await db.SaveChangesAsync();
        return user.Id;
    }

    protected async Task AddRefreshTokensAsync(int userId, int count)
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AthlifyDbContext>();
        for (var i = 0; i < count; i++)
        {
            db.RefreshTokens.Add(new RefreshToken
            {
                UserId = userId,
                TokenHash = Guid.NewGuid().ToString("N"),
                FamilyId = Guid.NewGuid(),
                Created = DateTime.UtcNow,
                CreatedByIp = "127.0.0.1",
                ExpiresAt = DateTime.UtcNow.AddDays(7),
            });
        }

        await db.SaveChangesAsync();
    }

    protected async Task<List<RefreshToken>> GetRefreshTokensAsync(int userId)
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AthlifyDbContext>();
        return await db.RefreshTokens.IgnoreQueryFilters().AsNoTracking().Where(t => t.UserId == userId).ToListAsync();
    }
}

// https://tunit.dev/docs/examples/aspnet#how-do-i-debug-lifecycle-issues
public class MyWebApplicationFactory : TestWebApplicationFactory<Program>
{
    // Runs before Program.cs (https://tunit.dev/docs/examples/aspnet#why-does-my-test-configuration-not-override-the-factory)
    protected override void ConfigureStartupConfiguration(IConfigurationBuilder configurationBuilder)
    {
        base.ConfigureStartupConfiguration(configurationBuilder);

        // Program.cs registers the DbContext through Aspire, which validates this key at startup.
        // The value is never used to connect: ConfigureWebHost swaps the provider for EF Core InMemory.
        configurationBuilder.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["ConnectionStrings:postgres-db"] = "Host=localhost;Database=unused",
        });
    }

    // Runs after Program.cs (https://tunit.dev/docs/examples/aspnet#why-does-my-test-configuration-not-override-the-factory)
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((context, config) =>
        {
        });

        builder.ConfigureServices(services =>
        {
            services.ReplaceService<IDbSeeder, SeedNothing>();
            ConfigureDatabase(services);
            services.RemoveAll<ICurrentUser>();
            services.AddScoped<ICurrentUser, TestCurrentUser>();
            services.AddAuthentication(options =>
                {
                    options.DefaultScheme = TestAuthHandler.SchemeName;
                    options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                    options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
                })
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, _ => { });
        });

        base.ConfigureWebHost(builder);
    }

    /// <summary>Replaces the production database provider. The default is EF Core InMemory, which needs no server.</summary>
    protected virtual void ConfigureDatabase(IServiceCollection services)
    {
        RemoveDbContextRegistrations(services);

        var databaseName = $"athlify-tests-{Guid.NewGuid()}";
        // InMemory ignores transactions; the serializable isolation of the role change is verified on PostgreSQL only
        // (see PostgresWebApplicationFactory).
        services.AddDbContext<AthlifyDbContext>(options => options
            .UseInMemoryDatabase(databaseName)
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning)));
    }

    protected static void RemoveDbContextRegistrations(IServiceCollection services)
    {
        var registrations = services
            .Where(d => d.ServiceType == typeof(AthlifyDbContext)
                || d.ServiceType.GenericTypeArguments.Contains(typeof(AthlifyDbContext)))
            .ToList();
        foreach (var registration in registrations)
        {
            services.Remove(registration);
        }
    }
}

public class SeedNothing : IDbSeeder
{
    public void Seed(AthlifyDbContext context, int ownerId)
    {
    }
}

/// <summary>Acts as the user whose id the request sends in <see cref="Header"/>.</summary>
public class TestCurrentUser(IHttpContextAccessor httpContextAccessor) : ICurrentUser
{
    public const string Header = "X-Test-User-Id";

    public int? UserId =>
        httpContextAccessor.HttpContext?.Request.Headers[Header] is { Count: 1 } value
        && int.TryParse(value[0], out var id)
            ? id
            : throw Athlify.Api.Domain.Common.DomainErrors.NotAuthenticated();
}

/// <summary>
/// Signs in the request with the role the test sends in <see cref="RoleHeader"/>, like a token would. The role is
/// what the token claims, which can be stale: the handler does not read the database.
/// </summary>
public class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "Test";
    public const string RoleHeader = "X-Test-User-Role";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(TestCurrentUser.Header, out var userId))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var role = Request.Headers.TryGetValue(RoleHeader, out var roleValue)
            ? roleValue.ToString()
            : nameof(UserRole.User);
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Role, role),
        };
        var identity = new ClaimsIdentity(claims, SchemeName, ClaimTypes.Name, ClaimTypes.Role);
        return Task.FromResult(AuthenticateResult.Success(
            new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName)));
    }
}
