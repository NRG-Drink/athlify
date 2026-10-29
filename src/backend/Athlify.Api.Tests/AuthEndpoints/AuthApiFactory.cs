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
    public static readonly string RootPath = Path.Combine(Directory.GetCurrentDirectory(), "AuthEndpoints");
    public virtual string ContentRootPath => RootPath;
    public Func<AthlifyDbContext> DbFactory { get; private set; } = () => throw new InvalidOperationException("DbFactory is not initialized.");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((context, config) =>
        {
            config.AddJsonFile(Path.Combine(ContentRootPath, "appsettings.json"), optional: false);
        });

        var connection = new SqliteConnection("Data Source=:memory:");
        connection.Open();

        var testUser = new User()
        {
            Username = "test",
            PasswordHash = new HashService().HashPassword("test"),
            Role = UserRole.Admin,
        };

        DbFactory = () => new AthlifyDbContext(new DbContextOptionsBuilder<AthlifyDbContext>().UseSqlite(connection).Options, new TestCurrentUser());
        using var db = DbFactory();
        db.Database.EnsureCreated();
        db.Users.Add(testUser);
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
                .AddDbContext<AthlifyDbContext>(options => options.UseSqlite(connection));
        });
    }

    public class TestCurrentUser : ICurrentUser
    {
        public int? UserId => 1;
    }
}
