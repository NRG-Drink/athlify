using Athlify.Api.Domain.Activities;
using Athlify.Api.Domain.Tags;
using Athlify.Api.Domain.Users;
using Athlify.Api.Domain.Vehicles;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Athlify.Api.Database.Configurations;

public class TagConfiguration : IEntityTypeConfiguration<Tag>
{
    public void Configure(EntityTypeBuilder<Tag> builder)
    {
        builder.HasOne<User>().WithMany().HasForeignKey(t => t.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.Property(t => t.Name).HasMaxLength(TagMutation.MaxNameLength);
        builder.Property(t => t.NormalizedName).HasMaxLength(TagMutation.MaxNameLength);
        builder.HasIndex(t => new { t.UserId, t.NormalizedName }).IsUnique();
    }
}

public class VehicleConfiguration : IEntityTypeConfiguration<Vehicle>
{
    public void Configure(EntityTypeBuilder<Vehicle> builder)
    {
        builder.HasOne<User>().WithMany().HasForeignKey(v => v.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.Property(v => v.Brand).HasMaxLength(EquipmentValidation.MaxNameLength);
        builder.Property(v => v.Model).HasMaxLength(EquipmentValidation.MaxNameLength);
        builder.Property(v => v.Nickname).HasMaxLength(EquipmentValidation.MaxNameLength);
        builder.Property(v => v.Description).HasMaxLength(EquipmentValidation.MaxDescriptionLength);
        builder.Property(v => v.Price).HasPrecision(10, 2);
        builder.HasIndex(v => new { v.UserId, v.StravaGearId })
            .IsUnique()
            .HasFilter("\"StravaGearId\" IS NOT NULL");
        builder.HasMany(v => v.Tags).WithMany(t => t.Vehicles).UsingEntity("VehicleTags");
    }
}

public class ActivityConfiguration : IEntityTypeConfiguration<Activity>
{
    public void Configure(EntityTypeBuilder<Activity> builder)
    {
        builder.HasOne<User>().WithMany().HasForeignKey(a => a.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.Property(a => a.Description).HasMaxLength(ActivityValidation.MaxDescriptionLength);
        builder.HasIndex(a => new { a.UserId, a.Date });
        builder.HasIndex(a => new { a.UserId, a.StravaActivityId })
            .IsUnique()
            .HasFilter("\"StravaActivityId\" IS NOT NULL");
        builder.HasOne(a => a.Vehicle)
            .WithMany(v => v.Activities)
            .HasForeignKey(a => a.VehicleId)
            .OnDelete(DeleteBehavior.SetNull);
        builder.HasMany(a => a.Tags).WithMany(t => t.Activities).UsingEntity("ActivityTags");
    }
}
