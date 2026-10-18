using Athlify.Build.Modules.General;
using ModularPipelines.Attributes;
using ModularPipelines.Context;
using ModularPipelines.DotNet.Extensions;
using ModularPipelines.Models;
using ModularPipelines.Modules;

namespace Athlify.Build.Modules.Dotnet;

[ModuleCategory(ModuleCategoryKey.Build)]
[DependsOn<FindRepoPaths>]
[DependsOn<DotnetRestoreSolution>(Optional = true)]
[NotInParallel(NotInParallelKey.BuildExecute)]
public class DotnetBuildSolution : Module<CommandResult>
{
    protected override async Task<CommandResult?> ExecuteAsync(IModuleContext context, CancellationToken cancellationToken)
    {
        var module = await context.GetModule<FindRepoPaths>();
        var isRestored = await context.IsSuccessful(context.GetModuleIfRegistered<DotnetRestoreSolution>());

        return await context.DotNet().Build(
            options: new()
            {
                ProjectSolution = module.ValueOrDefault!.Solution,
                NoRestore = isRestored,
                Configuration = "Release",
            },
            null,
            cancellationToken: cancellationToken);
    }
}
