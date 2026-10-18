using ModularPipelines.DotNet.Options;
using ModularPipelines.FileSystem;
using MPFile = ModularPipelines.FileSystem.File;

namespace Athlify.Build.Modules.Dotnet.Settings;

public record PublishProject(
    MPFile ProjectFile,
    DotNetPublishOptions PublishOptions,
    bool IsContainer = false)
{
    public Folder OutDir => new(PublishOptions.Output ?? "publish");
}
