using Athlify.Build.Modules.Docker;
using Athlify.Build.Modules.Dotnet;
using ModularPipelines.Attributes;
using ModularPipelines.Context;
using ModularPipelines.Git.Extensions;
using ModularPipelines.GitHub.Extensions;
using ModularPipelines.Modules;
using Octokit;

namespace Athlify.Build.Modules.General;

[ModuleCategory(ModuleCategoryKey.Release)]
[RunOnServerOnly]
[DependsOn<FindRepoPaths>]
[DependsOn<GitVersion>]
[DependsOn<DotnetPublish>(Optional = true)]
[DependsOn<DockerPushAthlifyImage>(Optional = true)]
[NotInParallel(NotInParallelKey.Release)]
public class GitHubReleaseCreate : Module<Release>
{
    protected override async Task<Release?> ExecuteAsync(IModuleContext context, CancellationToken cancellationToken)
    {
        var versionModule = await context.GetModule<GitVersion>();
        var gitHub = context.GitHub();
        var version = $"v{versionModule.ValueOrDefault}";
        var isMain = context.Git().Information.BranchName is var b && (b == "main" || b == "master");

        var release = new NewRelease(version)
        {
            Name = version,
            Draft = false,
            Prerelease = !isMain,
            GenerateReleaseNotes = true,
            TargetCommitish = context.Git().Information.LastCommitSha,
        };

        if (long.TryParse(gitHub.EnvironmentVariables.RepositoryId, out var repoIdLong))
        {
            return await gitHub.Client.Repository.Release.Create(repoIdLong, release);
        }

        return await gitHub.Client.Repository.Release.Create(gitHub.RepositoryInfo.Owner, gitHub.RepositoryInfo.RepositoryName, release);
    }
}
