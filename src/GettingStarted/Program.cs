using GettingStarted.Types;
using Microsoft.EntityFrameworkCore;

/* Created using the following sources
 * YouTube: https://www.youtube.com/watch?v=YL07NyBXC7M
 * Docs: https://chillicream.com/docs/hotchocolate/v13/get-started
 */
public partial class Program
{
    private static async Task Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        builder.Services.AddDbContext<TestDb>(options =>
        {
            options
                .UseInMemoryDatabase("TestDb")
                .LogTo(Console.WriteLine, LogLevel.Trace)
                .EnableSensitiveDataLogging();
        });

        builder
            .AddGraphQL()
            .AddMutationConventions(applyToAllMutations: true)
            .AddFiltering()
            .AddSorting()
            .AddTypes()
            .ModifyPagingOptions(e =>
            {
                e.DefaultPageSize = 10;
                e.IncludeTotalCount = true;
                e.MaxPageSize = 999;
                //e.EnableRelativeCursors = true;
            });

        var app = builder.Build();

        {
            await using var scope = app.Services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<TestDb>();
            DbSeeder.Seed(db);
        }

        app.MapGraphQL();

        app.RunWithGraphQLCommands(args);
    }
}