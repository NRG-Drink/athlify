using Athlify.Build.Modules.General;
using ModularPipelines.Attributes;
using ModularPipelines.Context;
using ModularPipelines.FileSystem;
using ModularPipelines.Modules;

namespace Athlify.Build.Modules.Dotnet;

[ModuleCategory(ModuleCategoryKey.TestReport)]
[RunOnServerOnly]
[DependsOn<FindRepoPaths>]
[DependsOn<DotnetTestReportGenerate>]
[NotInParallel(NotInParallelKey.TestExecute)]
public class DotnetTestReportCopyToArtifactsUpload() : Module<Folder>
{
    protected override async Task<Folder?> ExecuteAsync(IModuleContext context, CancellationToken cancellationToken)
    {
        var repoPathsModule = await context.GetModule<FindRepoPaths>();
        var repoPaths = repoPathsModule.ValueOrDefault!;

        var artifactsFolder = new Folder(Path.Combine(repoPaths.ArtifactsUploadTestReports.Path, "dotnet"));
        await artifactsFolder.CreateAsync(cancellationToken);
        var result = await repoPaths.TestResultsReport.CopyToAsync(artifactsFolder.Path, cancellationToken);

        return result;
    }
}
