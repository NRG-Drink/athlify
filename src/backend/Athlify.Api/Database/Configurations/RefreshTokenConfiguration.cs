using Athlify.Api.Domain.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Athlify.Api.Database.Configurations;

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> e)
    {
        e.HasKey(token => token.Id);

        e.Property(e => e.TokenHash).IsRequired().HasMaxLength(64);
        e.Property(e => e.CreatedByIp).IsRequired().HasMaxLength(45);
        e.Property(e => e.RevokedByIp).HasMaxLength(45);
        e.Property(e => e.ReasonRevoked).HasMaxLength(100);

        e.HasOne(e => e.User)
            .WithMany(u => u.RefreshTokens)
            .HasForeignKey(rt => rt.UserId)
            .OnDelete(DeleteBehavior.Cascade); // Delete all refresh tokens when the user is deleted
        e.HasOne(e => e.ParentToken)
          .WithMany()
          .HasForeignKey(e => e.ParentTokenId)
          .OnDelete(DeleteBehavior.ClientSetNull);

        e.HasIndex(e => e.TokenHash).IsUnique();
        e.HasIndex(e => e.FamilyId);
        e.HasIndex(e => e.ExpiresAt);
        e.HasIndex(e => e.UserId);
    }
}
