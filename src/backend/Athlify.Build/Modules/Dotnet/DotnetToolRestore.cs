using Athlify.Build.Modules.General;
using ModularPipelines.Attributes;
using ModularPipelines.Context;
using ModularPipelines.DotNet.Extensions;
using ModularPipelines.DotNet.Options;
using ModularPipelines.Models;
using ModularPipelines.Modules;
using ModularPipelines.Options;

namespace Athlify.Build.Modules.Dotnet;

[ModuleCategory(ModuleCategoryKey.TestReport)]
[DependsOn<FindRepoPaths>]
[NotInParallel(nameof(DotnetToolRestore))]
public class DotnetToolRestore : Module<CommandResult>
{
    protected override async Task<CommandResult?> ExecuteAsync(IModuleContext context, CancellationToken cancellationToken)
    {
        var repoPaths = await context.GetModule<FindRepoPaths>();

        var options = new DotNetToolRestoreOptions() { };
        var commandOptions = new CommandExecutionOptions() { WorkingDirectory = repoPaths.ValueOrDefault!.Repo };
        var result = await context.DotNet().Tool.Restore(options, commandOptions, cancellationToken);

        return result;
    }
}
