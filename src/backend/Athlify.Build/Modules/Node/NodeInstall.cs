using Athlify.Build.Modules.General;
using ModularPipelines.Attributes;
using ModularPipelines.Context;
using ModularPipelines.Models;
using ModularPipelines.Modules;
using ModularPipelines.Node.Extensions;
using ModularPipelines.Node.Models;

namespace Athlify.Build.Modules.Node;

[ModuleCategory(ModuleCategoryKey.Node)]
[DependsOn<FindRepoPaths>()]
[NotInParallel(NotInParallelKey.Node)]
public class NodeInstall : Module<CommandResult>
{
    protected override async Task<CommandResult?> ExecuteAsync(IModuleContext context, CancellationToken cancellationToken)
    {
        var repoPaths = await context.GetModule<FindRepoPaths>();

        var npmOptions = new NpmInstallOptions()
        {
            Arguments = ["--prefix", repoPaths.ValueOrDefault!.FrontendRoot.Path]
        };

        var result = await context.Node().Npm.Install(npmOptions, cancellationToken);
        return result;
    }
}
