using Athlify.Build.Modules.Dotnet.Settings;
using Athlify.Build.Modules.General;
using Microsoft.Extensions.Options;
using ModularPipelines.Attributes;
using ModularPipelines.Configuration;
using ModularPipelines.Context;
using ModularPipelines.DotNet.Extensions;
using ModularPipelines.DotNet.Options;
using ModularPipelines.FileSystem;
using ModularPipelines.Models;
using ModularPipelines.Modules;
using ModularPipelines.Options;

namespace Athlify.Build.Modules.Dotnet;

[ModuleCategory(ModuleCategoryKey.TestReport)]
[DependsOn<FindRepoPaths>]
[DependsOn<DotnetToolRestore>]
[DependsOn<DotnetTestRun>(Optional = true)]
[NotInParallel(NotInParallelKey.TestExecute)]
public class DotnetTestReportGenerate(IOptions<RunTestsSettings> reportSettings) : Module<PathCommandResult<Folder>>
{
    protected override ModuleConfiguration Configure()
        => ModuleConfiguration.Create()
            .WithSkipWhen(async (context) =>
            {
                var repoPaths = await context.GetModule<FindRepoPaths>();
                return repoPaths.ValueOrDefault!.TestResultsRun.Exists 
                    ? SkipDecision.DoNotSkip 
                    : SkipDecision.Skip("No test run folder found");
            })
            .Build();

    protected override async Task<PathCommandResult<Folder>?> ExecuteAsync(IModuleContext context, CancellationToken cancellationToken)
    {
        var repoPaths = await context.GetModule<FindRepoPaths>();

        // Help page: https://reportgenerator.io/usage
        var arguments = new List<string>
        {
            "run", "reportgenerator",
            "-reports:**/*.cobertura.xml",
            $"-targetdir:{repoPaths.ValueOrDefault!.TestResultsReport.Path}",
            "-reporttypes:Html,MarkdownSummaryGithub",
            "-assemblyfilters:-*Test*",
            "-classfilters:-Athlify.Api.Database*;-HotChocolate*;-Microsoft*",
            $"-historydir:{repoPaths.ValueOrDefault!.TestHistory}"
        };
        reportSettings.Value!.ReportArgs(arguments);

        var toolOptions = new DotNetToolOptions() { Arguments = arguments, };
        var commandOptions = new CommandExecutionOptions() { WorkingDirectory = repoPaths.ValueOrDefault!.TestResultsBase };
        var result = await context.DotNet().Tool.Execute(toolOptions, commandOptions, cancellationToken);

        return new(repoPaths.ValueOrDefault!.TestResultsReport, result);
    }
}
