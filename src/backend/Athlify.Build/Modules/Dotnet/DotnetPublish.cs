using Athlify.Build.Modules.Dotnet.Settings;
using Athlify.Build.Modules.General;
using Athlify.Build.Modules.Node;
using EnumerableAsyncProcessor.Extensions;
using Microsoft.Extensions.Options;
using ModularPipelines.Attributes;
using ModularPipelines.Configuration;
using ModularPipelines.Context;
using ModularPipelines.DotNet.Extensions;
using ModularPipelines.Models;
using ModularPipelines.Modules;

namespace Athlify.Build.Modules.Dotnet;

[ModuleCategory(ModuleCategoryKey.Publish)]
[DependsOn<FindRepoPaths>]
[DependsOn<GitVersion>]
[DependsOn<DotnetBuildSolution>(Optional = true)]
[DependsOn<DotnetTestRun>(Optional = true)]
[DependsOn<NodeTest>(Optional = true)]
[DependsOn<NodeBuildCopyAthlifyDistToApi>(Optional = true)]
[NotInParallel(NotInParallelKey.BuildExecute, NotInParallelKey.PublishExecute)]
public class DotnetPublish(IOptions<PublishSettings> publishOptions) : Module<PathCommandResult<PublishProject>[]>
{
    protected override ModuleConfiguration Configure()
        => ModuleConfiguration.Create()
            .WithSkipWhen(async (IModuleContext context) =>
            {
                var maybeRepoPaths = await context.GetModule<FindRepoPaths>();
                var repoPaths = maybeRepoPaths.ValueOrDefault!;

                if (repoPaths.ExeProjects.Count is not 0
                    || repoPaths.WinExeProjects.Count is not 0
                    || repoPaths.ContainerProjects.Count is not 0)
                {
                    return SkipDecision.DoNotSkip;
                }

                return SkipDecision.Skip("No projects to publish.");
            })
            .Build();

    protected override async Task<PathCommandResult<PublishProject>[]?> ExecuteAsync(IModuleContext context, CancellationToken cancellationToken)
    {
        var maybeRepoPaths = await context.GetModule<FindRepoPaths>();
        var versionModule = await context.GetModule<GitVersion>();
        var options = publishOptions.Value;
        var repoPaths = maybeRepoPaths.ValueOrDefault!;
        var outDir = repoPaths.Artifacts;
        outDir.Create();

        var version = versionModule.ValueOrDefault!;
        var exeProjects = options.GetExeProjects(repoPaths.ExeProjects, version, outDir);
        var winExeProjects = options.GetExeProjects(repoPaths.WinExeProjects, version, outDir);
        var containerProjects = options.GetContainerProjects(repoPaths.ContainerProjects, version, outDir);

        var projectConfig = exeProjects
            .Concat(winExeProjects)
            .Concat(containerProjects);

        var results = await projectConfig
            .ToAsyncProcessorBuilder()
            .SelectAsync(e => context.SubModule(
                e.ProjectFile.NameWithoutExtension,
                () => context.DotNet().Publish(e.PublishOptions, cancellationToken: cancellationToken)
            ))
            .ProcessOneAtATime();

        var resultsArray = results
            .Select(commandResult =>
            {
                var project = projectConfig.FirstOrDefault(kvp => commandResult.CommandInput.Contains(kvp.ProjectFile.Path));
                var result = new PathCommandResult<PublishProject>(project, commandResult);
                return result;
            })
            .ToArray();

        return resultsArray;
    }
}
