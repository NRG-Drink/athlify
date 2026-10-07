using Athlify.Api.Domain.Body;
using Athlify.Api.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Athlify.Api.Database.Configurations;

public class BodyStatsConfiguration : IEntityTypeConfiguration<BodyStats>
{
    public void Configure(EntityTypeBuilder<BodyStats> builder)
    {
        builder.HasOne<User>().WithMany().HasForeignKey(b => b.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(b => new { b.UserId, b.Date });

        builder.HasMany(b => b.Comments)
            .WithOne()
            .HasForeignKey("BodyStatsId")
            .IsRequired()
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class CommentConfiguration : IEntityTypeConfiguration<Comment>
{
    public void Configure(EntityTypeBuilder<Comment> builder)
    {
        builder.Property(c => c.Content).HasMaxLength(BodyStatsValidation.MaxCommentLength);
    }
}
