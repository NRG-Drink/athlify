namespace Athlify.Api.Database;

public interface IDbSeeder
{
    abstract void Seed(InMemoryDb context);
}