using Athlify.Build.Modules.General;
using ModularPipelines.Attributes;
using ModularPipelines.Configuration;
using ModularPipelines.Context;
using ModularPipelines.Models;
using ModularPipelines.Modules;

namespace Athlify.Build.Modules.Node;

[ModuleCategory(ModuleCategoryKey.Node)]
[RunOnWindows]
[DependsOn<FindRepoPaths>()]
[DependsOn<NodeTestWithCoverage>()]
[NotInParallel(nameof(NodeTestReportOpen))]
public class NodeTestReportOpen : Module<CommandResult>
{
    protected override ModuleConfiguration Configure()
        => ModuleConfiguration.Create()
            .WithIgnoreFailures()
            .WithSkipWhen(async context =>
            {
                var repoPaths = await context.GetModule<FindRepoPaths>();
                return repoPaths.ValueOrDefault!.FrontendTestReportHtml.Exists
                    ? SkipDecision.DoNotSkip
                    : SkipDecision.Skip($"Test report HTML file does not exist at {repoPaths.ValueOrDefault!.FrontendTestReportHtml.Path}.");
            })
            .Build();

    protected override async Task<CommandResult?> ExecuteAsync(IModuleContext context, CancellationToken cancellationToken)
    {
        var repoPaths = await context.GetModule<FindRepoPaths>();
        var result = await context.Shell.PowerShell.Script(new($"start") { Arguments = [repoPaths.ValueOrDefault!.FrontendTestReportHtml.Path] }, cancellationToken);
        return result;
    }
}
