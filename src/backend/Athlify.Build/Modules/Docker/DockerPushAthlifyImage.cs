using Athlify.Build.Modules.Docker.Settings;
using Athlify.Build.Modules.Dotnet;
using Athlify.Build.Modules.General;
using Microsoft.Extensions.Options;
using ModularPipelines.Attributes;
using ModularPipelines.Context;
using ModularPipelines.Docker.Extensions;
using ModularPipelines.Docker.Options;
using ModularPipelines.Git.Extensions;
using ModularPipelines.Models;
using ModularPipelines.Modules;
using ModularPipelines.Options;

namespace Athlify.Build.Modules.Docker;

[ModuleCategory(ModuleCategoryKey.Container)]
[RunOnServerOnly]
[DependsOn<GitVersion>()]
[DependsOn<DotnetPublish>()]
[DependsOn<DockerLogin>()]
[NotInParallel(NotInParallelKey.Container)]
public class DockerPushAthlifyImage(IOptions<DockerPushAthlifyImageSettings> options) : Module<string>
{
#pragma warning disable StatefulModule // Stateful module detected
    private IModuleContext _context = null!;
    private CancellationToken _cancellationToken = default;
#pragma warning restore StatefulModule // Stateful module detected

    protected override async Task<string?> ExecuteAsync(IModuleContext context, CancellationToken cancellationToken)
    {
        _context = context;
        _cancellationToken = cancellationToken;

        var versionInfo = await context.Git().Versioning.GetGitVersioningInformation();
        var isMainBranch = "main" == versionInfo.BranchName;
        var dynamicVerstion = isMainBranch
            ? "latest"
            : "nightly";

        var gitVersion = await context.GetModule<GitVersion>();
        var version = gitVersion.ValueOrDefault!;
        var containerImageName = options.Value.ContainerImageName;

        // A tag must have the GitHub registry prefix to be pushed to GitHub Container Registry (GHCR)
        var registry = "ghcr.io/nrg-drink";
        var tag = $"{containerImageName}:{version}";
        var gitHubTagVersion = $"{registry}/{containerImageName}:{version}";
        var gitHubTagLatest = $"{registry}/{containerImageName}:{dynamicVerstion}";

        var versionTagResult = await TagImage(tag, gitHubTagVersion);
        var latestTagResult = await TagImage(tag, gitHubTagLatest);

        var versionPushResult = await PushImage(gitHubTagVersion);
        var latestPushResult = await PushImage(gitHubTagLatest);

        return $"Version Tag Result: {versionTagResult.StandardOutput}\n" +
               $"Latest Tag Result: {latestTagResult.StandardOutput}\n" +
               $"Version Push Result: {versionPushResult.StandardOutput}\n" +
               $"Latest Push Result: {latestPushResult.StandardOutput}";
    }

    private async Task<CommandResult> TagImage(string image, string tag)
    {
        var options = new PowershellScriptOptions($"docker tag {image} {tag}");
        var result = await _context.Shell.PowerShell.Script(options, _cancellationToken);
        return result;
    }

    private async Task<CommandResult> PushImage(string tag)
    {
        var options = new DockerPushOptions() { Options = tag };
        var result = await _context.Docker().Push(options, cancellationToken: _cancellationToken);
        return result;
    }
}
