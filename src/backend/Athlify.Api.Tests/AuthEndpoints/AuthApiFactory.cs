using Athlify.Api.Database;
using Athlify.Api.Domain.Auth;
using Athlify.Api.Domain.Users;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using TUnit.AspNetCore;

namespace Athlify.Api.Tests.AuthEndpoints;

public abstract class AuthApiFactory : TestWebApplicationFactory<Program>
{
    private SqliteConnection? keepAliveConnection;

    public static readonly string RootPath = Path.Combine(Directory.GetCurrentDirectory(), "AuthEndpoints");
    public virtual string ContentRootPath => RootPath;
    public Func<AthlifyDbContext> DbFactory { get; private set; } = () => throw new InvalidOperationException("DbFactory is not initialized.");
    protected virtual Action<AthlifyDbContext> SeedDbFunc { get; set; } = db => AddTestUser(db);

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((context, config) =>
        {
            config.AddJsonFile(Path.Combine(ContentRootPath, "appsettings.json"), optional: false);
        });

        var connectionString = $"Data Source=auth-tests-{Guid.NewGuid()};Mode=Memory;Cache=Shared";
        keepAliveConnection = new SqliteConnection(connectionString);
        keepAliveConnection.Open();

        DbFactory = () => new AthlifyDbContext(new DbContextOptionsBuilder<AthlifyDbContext>().UseSqlite(connectionString).Options, new TestCurrentUser());
        using var db = DbFactory();
        db.Database.EnsureCreated();
        SeedDbFunc(db);
        db.SaveChanges();

        builder.UseEnvironment("Development");
        builder.ConfigureServices((context, services) =>
        {
            services.RemoveAll<IDbContextOptionsConfiguration<AthlifyDbContext>>();
            services.RemoveAll<DbContextOptions<AthlifyDbContext>>();
            services.RemoveAll<AthlifyDbContext>();
            services.RemoveAll<DbContext>();
            services
                .Configure<JwtOptions>(context.Configuration.GetRequiredSection(JwtOptions.SectionName))
                .AddScoped<ITokenService, TokenService>()
                .AddScoped<ICookieService, CookieService>()
                .AddScoped<IHashService, HashService>()
                .AddDbContext<AthlifyDbContext>(options => options.UseSqlite(connectionString));
        });
    }

    public new void Dispose()
    {
        base.Dispose();
        keepAliveConnection?.Dispose();
    }

    protected static User AddTestUser(
        AthlifyDbContext db,
        string? username = null,
        string? password = null,
        string? role = null)
    {
        var testUser = new User()
        {
            Email = Guid.NewGuid().ToString() + "@test.com",
            Username = username ?? "test",
            PasswordHash = new HashService().HashPassword(password ?? "test"),
            Role = role ?? UserRole.Admin,
        };
        var user = db.Users.Add(testUser).Entity;
        db.SaveChanges();

        return user;
    }

    public class TestCurrentUser : ICurrentUser
    {
        public int? UserId => 1;
    }
}
