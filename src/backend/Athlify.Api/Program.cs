public partial class Program
{
    private static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        builder
            .AddGraphQL()
            .AddTypes();

        var app = builder.Build();

        app.MapGraphQL();

        app.RunWithGraphQLCommands(args);
    }
}