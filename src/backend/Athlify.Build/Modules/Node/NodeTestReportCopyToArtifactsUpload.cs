using Athlify.Build.Modules.General;
using ModularPipelines.Attributes;
using ModularPipelines.Context;
using ModularPipelines.FileSystem;
using ModularPipelines.Modules;

namespace Athlify.Build.Modules.Node;

[ModuleCategory(ModuleCategoryKey.Node)]
[RunOnServerOnly]
[DependsOn<FindRepoPaths>()]
[DependsOn<NodeTestWithCoverage>()]
[NotInParallel(nameof(NodeTestReportCopyToArtifactsUpload))]
public class NodeTestReportCopyToArtifactsUpload : Module<Folder>
{
    protected override async Task<Folder?> ExecuteAsync(IModuleContext context, CancellationToken cancellationToken)
    {
        var repoPathsModule = await context.GetModule<FindRepoPaths>();
        var repoPaths = repoPathsModule.ValueOrDefault!;

        var artifactsFolder = new Folder(Path.Combine(repoPaths.ArtifactsUploadTestReports.Path, "node"));
        await artifactsFolder.CreateAsync(cancellationToken);
        var result = await repoPaths.FrontendCoverage.CopyToAsync(artifactsFolder.Path, cancellationToken);

        return result;
    }
}
