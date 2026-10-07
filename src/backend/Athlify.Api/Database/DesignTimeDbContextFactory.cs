using Athlify.Api.Domain.Common;
using Athlify.Api.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Athlify.Api.Database;

/// <summary>
/// Used by <c>dotnet ef</c> only. The connection string is never opened to create a migration; the
/// Aspire connection string exists only when the AppHost runs the API.
/// </summary>
public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AthlifyDbContext>
{
    public AthlifyDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<AthlifyDbContext>()
            .UseNpgsql("Host=localhost;Database=athlify_design_time")
            .Options;
        return new AthlifyDbContext(options, new NoCurrentUser());
    }

    private sealed class NoCurrentUser : ICurrentUser
    {
        public int UserId => throw DomainErrors.NotAuthenticated();
    }
}
