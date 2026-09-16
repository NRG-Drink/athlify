using Athlify.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Database;

public class InMemoryDb : DbContext
{
    public InMemoryDb(DbContextOptions<InMemoryDb> options) : base(options) { }
    
    public DbSet<BodyStats> BodyStats => Set<BodyStats>();
    public DbSet<Comment> Comments => Set<Comment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<BodyStats>()
            .HasMany(b => b.Comments)
            .WithOne()
            .HasForeignKey("BodyStatsId");
    }
}
