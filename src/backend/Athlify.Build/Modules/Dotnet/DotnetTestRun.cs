using Athlify.Build.Modules.Dotnet.Settings;
using Athlify.Build.Modules.General;
using EnumerableAsyncProcessor.Extensions;
using Microsoft.Extensions.Options;
using ModularPipelines.Attributes;
using ModularPipelines.Context;
using ModularPipelines.DotNet.Extensions;
using ModularPipelines.Models;
using ModularPipelines.Modules;

namespace Athlify.Build.Modules.Dotnet;

[ModuleCategory(ModuleCategoryKey.Test)]
[DependsOn<FindRepoPaths>]
[DependsOn<DotnetBuildSolution>(Optional = true)]
[NotInParallel(NotInParallelKey.TestExecute)]
public class DotnetTestRun(IOptions<RunTestsSettings> testSettings) : Module<CommandResult[]>
{
    protected override async Task<CommandResult[]?> ExecuteAsync(IModuleContext context, CancellationToken cancellationToken)
    {
        var repoPaths = await context.GetModule<FindRepoPaths>();
        var isBuilt = await context.IsSuccessful(context.GetModuleIfRegistered<DotnetBuildSolution>());

        var testReportArgs = new RunTestsOptions()
        {
            Coverage = true,
            CoverageOutputFormat = "cobertura",
            TreenodeFilter = "/*/*/*/*[Category!=NotRunInPipeline]",
            ResultsDirecotry = repoPaths.ValueOrDefault!.TestResultsData.Path,
            Arguments = [],
        };

        var processOptions = repoPaths.ValueOrDefault!.TestProjects
            .Select(e =>
            {
                var optionCopy = testReportArgs with { };
                testSettings.Value!.RunArgs(e, optionCopy);
                return (File: e, TestRunOptions: optionCopy);
            })
            .ToArray();

        var results = await processOptions
            .ToAsyncProcessorBuilder()
            .SelectAsync(e => context.SubModule(e.File.NameWithoutExtension, () => context.DotNet().Run(new()
            {
                Project = e.File.Path,
                NoRestore = isBuilt,
                NoBuild = isBuilt,
                Configuration = "Release",
                Arguments = e.TestRunOptions.ToArguments(),
            })))
            .ProcessInParallel();

        return results;
    }
}
