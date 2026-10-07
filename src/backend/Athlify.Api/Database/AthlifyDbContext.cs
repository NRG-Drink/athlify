using Athlify.Api.Domain.Activities;
using Athlify.Api.Domain.Body;
using Athlify.Api.Domain.Common;
using Athlify.Api.Domain.Tags;
using Athlify.Api.Domain.Users;
using Athlify.Api.Domain.Vehicles;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Database;

/// <summary>
/// The single place that enforces ownership: every owned entity has the named query filter
/// <see cref="OwnerFilter"/>, and <see cref="SaveChangesAsync(CancellationToken)"/> assigns new records to the
/// signed-in user. Resolvers therefore never filter by user themselves.
/// </summary>
public class AthlifyDbContext(DbContextOptions<AthlifyDbContext> options, ICurrentUser currentUser)
    : DbContext(options)
{
    public const string OwnerFilter = "Owner";

    /// <summary>Hides soft-deleted activities; Strava synchronization and deletes that must see them ignore it.</summary>
    public const string NotDeletedFilter = "NotDeleted";

    public DbSet<User> Users => Set<User>();
    public DbSet<BodyStats> BodyStats => Set<BodyStats>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<Activity> Activities => Set<Activity>();

    /// <summary>
    /// Read by the query filters each time a query runs (EF Core parameterizes context members), so one
    /// model serves every user. Throws <c>NOT_AUTHENTICATED</c> when nobody is signed in.
    /// </summary>
    private int CurrentUserId => currentUser.UserId;

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        // Strings keep the stored values readable and allow new enum members without rewriting data.
        configurationBuilder.Properties<Enum>().HaveConversion<string>();
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AthlifyDbContext).Assembly);

        foreach (var entityType in modelBuilder.Model.GetEntityTypes()
                     .Where(t => typeof(Entity).IsAssignableFrom(t.ClrType)))
        {
            modelBuilder.Entity(entityType.ClrType).HasIndex(nameof(Entity.Uid)).IsUnique();
        }

        modelBuilder.Entity<User>().HasQueryFilter(OwnerFilter, u => u.Id == CurrentUserId);
        modelBuilder.Entity<BodyStats>().HasQueryFilter(OwnerFilter, b => b.UserId == CurrentUserId);
        modelBuilder.Entity<Tag>().HasQueryFilter(OwnerFilter, t => t.UserId == CurrentUserId);
        modelBuilder.Entity<Vehicle>().HasQueryFilter(OwnerFilter, v => v.UserId == CurrentUserId);
        modelBuilder.Entity<Activity>().HasQueryFilter(OwnerFilter, a => a.UserId == CurrentUserId);
        modelBuilder.Entity<Activity>().HasQueryFilter(NotDeletedFilter, a => a.DeletedAt == null);
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        StampEntries();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        StampEntries();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    private void StampEntries()
    {
        var now = DateTime.UtcNow;
        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.State == EntityState.Added)
            {
                if (entry.Entity is IOwned { UserId: 0 } owned)
                {
                    owned.UserId = CurrentUserId;
                }

                if (entry.Entity is Entity added)
                {
                    added.CreatedAt = now;
                    added.ModifiedAt = now;
                }
            }
            else if (entry is { State: EntityState.Modified, Entity: Entity modified })
            {
                modified.ModifiedAt = now;
            }
        }
    }
}
