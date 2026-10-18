using Athlify.Build.Modules.General;
using ModularPipelines.Attributes;
using ModularPipelines.Context;
using ModularPipelines.DotNet.Extensions;
using ModularPipelines.Models;
using ModularPipelines.Modules;

namespace Athlify.Build.Modules.Dotnet;

[ModuleCategory(ModuleCategoryKey.Build)]
[DependsOn<FindRepoPaths>]
[NotInParallel(NotInParallelKey.BuildExecute)]
public class DotnetRestoreSolution : Module<CommandResult>
{
    protected override async Task<CommandResult?> ExecuteAsync(IModuleContext context, CancellationToken cancellationToken)
    {
        var module = await context.GetModule<FindRepoPaths>();
        return await context.DotNet().Restore(
            options: new()
            {
                Arguments = [module.ValueOrDefault!.Solution.Path],
            },
            cancellationToken: cancellationToken);
    }
}
