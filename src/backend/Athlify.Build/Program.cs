using Athlify.Build.Modules.Docker;
using Athlify.Build.Modules.Docker.Settings;
using Athlify.Build.Modules.Dotnet;
using Athlify.Build.Modules.Dotnet.Settings;
using Athlify.Build.Modules.General;
using Athlify.Build.Modules.General.Settings;
using Athlify.Build.Modules.Node;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ModularPipelines;
using ModularPipelines.DotNet.Options;
using ModularPipelines.Extensions;

namespace Athlify.Build;

internal class Program
{
    static async Task Main(string[] args)
    {
        var builder = Pipeline.CreateBuilder();

        builder.Configuration
            .AddEnvironmentVariables();

        builder.ConfigureServices((context, collection) =>
        {
            collection.PostConfigure<FindRepoPathSettings>(s =>
            {
                s.ManipulateAfterCreation = repo =>
                {
                    repo.BackendRoot = new(Path.Combine(repo.Repo.Path, "src", "backend"));
                    repo.BackendWwwRootAppRelative = Path.Combine("wwwroot");
                    repo.FrontendRoot = new(Path.Combine(repo.Repo.Path, "src", "frontend", "athlify"));
                    return repo;
                };
                s.ManipulateAfterFinish = repo =>
                {
                    repo.LibraryProjects.Clear();
                    repo.ExeProjects.RemoveAll(e => e.Path.Contains(".Build"));
                    repo.ExeProjects.RemoveAll(e => e.Path.Contains(".AppHost"));
                };
            });

            var athlifyContainerImageName = "athlify";
            collection.PostConfigure<PublishSettings>(e =>
            {
                e.AddFindProject(
                    e => e.NameWithoutExtension.Equals("Athlify.Api", StringComparison.OrdinalIgnoreCase),
                    options => (DotNetPublishOptions)options.WithArguments(
                        "/t:PublishContainer",
                        $"-p:ContainerImageName={athlifyContainerImageName}") with
                    {
                        Runtime = DotNetRidCatalog.Linux.LinuxX64,
                        Configuration = "Release",
                        NoSelfContained = true,
                    });
            });

            collection.PostConfigure<DockerPushAthlifyImageSettings>(e =>
            {
                e.ContainerImageName = athlifyContainerImageName;
            });

            collection.PostConfigure<GitVersionSettings>(e => e.VersionFunc = e.VersionFunc);
        });

        builder.ConfigurePipelineOptions((context, options) =>
        {
            options.PrintLogo = false;
        });

        // General
        builder
            .AddModule<FindRepoPaths>();

        // Dotnet
        builder
            .AddModule<DotnetRestoreSolution>()
            .AddModule<DotnetBuildSolution>()
            .AddModule<DotnetTestRun>()
            .AddModule<DotnetTestReportGenerate>()
                .AddModule<DotnetToolRestore>()
                .AddModule<DotnetTestReportOpen>()
                .AddModule<DotnetTestReportAppendToGitHubSummary>();

        // Node
        builder
            // Speed up the build on local machine a little.
#if DEBUG
            .AddModule<NodeInstall>()
#else
            .AddModule<NodeCleanInstall>()
#endif
            .AddModule<NodeRelay>()
            .AddModule<NodeBuild>()
            .AddModule<NodeTestWithCoverage>()
                .AddModule<NodeTestReportOpen>();

        if (!args.Contains("test-only"))
        {
            // General
            builder
                .AddModule<GitVersion>()
                .AddModule<DockerLogin>()
                .AddModule<DockerPushAthlifyImage>()
                .AddModule<GitHubReleaseCreate>();

            // Dotnet
            builder
                .AddModule<DotnetPublish>();

            // Node
            builder
                .AddModule<NodeBuildCopyAthlifyDistToApi>();
        }

        var pipeline = await builder.BuildAsync();
        var summary = await pipeline.RunAsync();
    }
}
