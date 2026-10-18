using Athlify.Build.Modules.General;
using ModularPipelines.Attributes;
using ModularPipelines.Context;
using ModularPipelines.FileSystem;
using ModularPipelines.Modules;

namespace Athlify.Build.Modules.Node;

[ModuleCategory(ModuleCategoryKey.Node)]
[DependsOn<FindRepoPaths>()]
[DependsOn<NodeCleanInstall>()]
[DependsOn<NodeBuild>(Optional = true)]
[NotInParallel(NotInParallelKey.Node)]
public class NodeBuildCopyAthlifyDistToApi: Module<Folder>
{
    protected override async Task<Folder?> ExecuteAsync(IModuleContext context, CancellationToken cancellationToken)
    {
        var repoPathsModule = await context.GetModule<FindRepoPaths>();
        var repoPaths = repoPathsModule.ValueOrDefault!;

        var frontendDistPath = repoPaths.FrontendDist.Path;
        var apiProject = repoPaths.ContainerProjects.First(e => e.NameWithoutExtension.Contains("Athlify.Api", StringComparison.OrdinalIgnoreCase));

        var artifactsWwwRoot = new Folder(Path.Combine(apiProject.Folder!, repoPaths.BackendWwwRootAppRelative));
        await artifactsWwwRoot.CreateAsync(cancellationToken);
        artifactsWwwRoot.Clean();

        var result = await repoPaths.FrontendDist.CopyToAsync(artifactsWwwRoot.Path, cancellationToken);
        return result;
    }
}
