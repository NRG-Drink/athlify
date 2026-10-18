using Athlify.Build.Modules.General;
using ModularPipelines.Attributes;
using ModularPipelines.Configuration;
using ModularPipelines.Context;
using ModularPipelines.Models;
using ModularPipelines.Modules;

namespace Athlify.Build.Modules.Dotnet;

[RunOnLocalMachineOnly]
[RunOnWindows]
[DependsOn<FindRepoPaths>]
[DependsOn<DotnetTestReportGenerate>(Optional = true)]
[NotInParallel(nameof(DotnetTestReportOpen))]
public class DotnetTestReportOpen : Module<CommandResult>
{
    protected override ModuleConfiguration Configure()
        => ModuleConfiguration.Create()
            .WithIgnoreFailures()
            .WithSkipWhen(async context =>
            {
                var repoPaths = await context.GetModule<FindRepoPaths>();
                return repoPaths.ValueOrDefault!.TestReportHtml.Exists
                    ? SkipDecision.DoNotSkip
                    : SkipDecision.Skip($"Test report HTML file does not exist at {repoPaths.ValueOrDefault!.TestReportHtml.Path}.");
            })
            .Build();

    protected override async Task<CommandResult?> ExecuteAsync(IModuleContext context, CancellationToken cancellationToken)
    {
        var repoPaths = await context.GetModule<FindRepoPaths>();
        var result = await context.Shell.PowerShell.Script(new($"start") { Arguments = [repoPaths.ValueOrDefault!.TestReportHtml.Path] }, cancellationToken);
        return result;
    }
}
