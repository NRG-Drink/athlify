namespace Athlify.Api.Database;

public interface IDbSeeder
{
    /// <summary>Adds sample data owned by <paramref name="ownerId"/>.</summary>
    void Seed(AthlifyDbContext context, int ownerId);
}