using Athlify.AppHost;

// Docs: https://aspire.dev/get-started/first-app/?aspire-lang=csharp
internal class Program
{
    private static readonly string _frontendDir = Path.Combine("..", "..", "frontend", "athlify");

    private static void Main(string[] args)
    {
        if (!File.Exists(Path.Combine(_frontendDir, "package.json")))
        {
            throw new FileNotFoundException($"Could not find package.json at {_frontendDir}. Make sure the frontend directory is correct.");
        }

        var builder = DistributedApplication.CreateBuilder(args);

        var postgres = builder
            .AddPostgres("postgres-container")
            //.WithImageTag("latest")
            //.WithLifetime(ContainerLifetime.Persistent)
            .WithDataVolume("athlify-postgres-data")
            .AddDatabase("postgres-db");

        var api = builder
            .AddProject<Projects.Athlify_Api>("cs-api")
            //.WithHttpHealthCheck("/health")
            .WithExternalHttpEndpoints()
            .WithReference(postgres)
            .WaitFor(postgres);

        var shouldStartFrontend = !args.Any(e => e.Contains("--no-frontend", StringComparison.OrdinalIgnoreCase));
        if (shouldStartFrontend)
        {
            var shouldOpenFrontendInBrowser = !args.Any(e => e.Contains("--disable-open-frontend", StringComparison.OrdinalIgnoreCase));
            var webfrontend = builder
                .OpenInBrowserAfterCreated("react-frontend", shouldOpenFrontendInBrowser)
                .AddViteApp("react-frontend", _frontendDir, runScriptName: "dev")
                .WithHttpEndpoint(5096)
                .WithReference(api);
        }

        builder.Build().Run();
    }
}
