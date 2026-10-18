using MPFile = ModularPipelines.FileSystem.File;

namespace Athlify.Build.Modules.Dotnet.Settings;

public class RunTestsSettings
{
    public Action<MPFile, RunTestsOptions> RunArgs { get; set; } = (projectName, options) => { };
    public Action<List<string>> ReportArgs { get; set; } = (options) => { };
}
