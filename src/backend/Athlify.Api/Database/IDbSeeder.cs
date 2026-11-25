namespace Athlify.Api.Database;

public interface IDbSeeder
{
    void Seed(AthlifyDbContext context, int ownerId);
}
