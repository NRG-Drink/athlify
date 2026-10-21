using MPFile = ModularPipelines.FileSystem.File;

namespace Athlify.Build.Modules.General.Settings;

public class FindRepoPathSettings
{
    public Func<RepoPaths, RepoPaths> ManipulateAfterCreation { get; set; } = e => e;
    public Func<IEnumerable<MPFile>, IEnumerable<MPFile>> ManipulaeAfterProjectDiscovery { get; set; } = e => e;
    public Action<RepoPaths> ManipulateAfterFinish { get; set; } = e => { };
}
