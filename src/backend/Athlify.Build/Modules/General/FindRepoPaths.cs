using Athlify.Build.Common;
using Athlify.Build.Modules.General.Settings;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ModularPipelines.Attributes;
using ModularPipelines.Context;
using ModularPipelines.FileSystem;
using ModularPipelines.Git.Extensions;
using ModularPipelines.GitHub.Extensions;
using ModularPipelines.Modules;
using System.Text.Json;
using System.Text.Json.Serialization;
using MPFile = ModularPipelines.FileSystem.File;

namespace Athlify.Build.Modules.General;

[ModuleCategory(ModuleCategoryKey.Build)]
[NotInParallel(nameof(FindRepoPaths))]
public class FindRepoPaths(IOptions<FindRepoPathSettings> repoPathSettings) : Module<RepoPaths>
{
    private readonly JsonSerializerOptions _jsonOptions = new() { WriteIndented = true, };

    protected override async Task<RepoPaths?> ExecuteAsync(IModuleContext context, CancellationToken cancellationToken)
    {
        var rootDir = context.Git().RootDirectory;
        var isServer = context.IsRunningInCI();
        var paths = new RepoPaths()
        {
            IsServer = isServer,
            Repo = rootDir,
        };

        paths = repoPathSettings.Value.ManipulateAfterCreation(paths);

        var solutionFile = paths.BackendRoot
            .GetFiles(e => e.Path.EndsWith(".slnx", StringComparison.OrdinalIgnoreCase))
            .FirstOrDefault()
            ?? throw new ArgumentNullException($"No solution found in '{rootDir}'");
        var projectFiles = solutionFile.Folder!.GetFiles(e => e.Path.EndsWith(".csproj", StringComparison.OrdinalIgnoreCase));
        projectFiles = repoPathSettings.Value.ManipulaeAfterProjectDiscovery(projectFiles);
        var (exes, libs, winexes, modules, tests, container) = SplitProjects(projectFiles);

        paths = paths with
        {
            Solution = solutionFile,

            ExeProjects = [.. exes],
            TestProjects = [.. tests],
            LibraryProjects = [.. libs],
            WinExeProjects = [.. winexes],
            ModuleProjects = [.. modules],
            ContainerProjects = [.. container],
        };

        repoPathSettings.Value.ManipulateAfterFinish(paths);
        _jsonOptions.Converters.Add(new MyMpFileConterter(paths.Repo.Parent?.Path));
        _jsonOptions.Converters.Add(new MyMpFolderConterter(paths.Repo.Parent?.Path));
        var json = JsonSerializer.Serialize(paths, _jsonOptions);
        context.Logger.LogInformation("RepoPaths:\n{Json}", json);

        return paths;
    }

    // Different repo types: https://learn.microsoft.com/en-us/visualstudio/msbuild/common-msbuild-project-properties?view=visualstudio
    private static (MPFile[], MPFile[], MPFile[], MPFile[], MPFile[], MPFile[]) SplitProjects(IEnumerable<MPFile> projects)
    {
        List<MPFile> exe = [], lib = [], winexe = [], module = [], container = [];

        foreach (var e in projects)
        {
            var content = System.IO.File.ReadAllText(e.Path);
            var containerIndex = content.IndexOf("ContainerRepository");
            if (containerIndex > 1)
            {
                container.Add(e);
                continue;
            }

            var index = content.IndexOf("<OutputType>");
            if (index < 0)
            {
                lib.Add(e);
                continue;
            }

            var shrt = content.Substring(index + 12, 7);
            if (shrt.StartsWith("Exe", StringComparison.OrdinalIgnoreCase))
            {
                exe.Add(e);
            }
            else if (shrt.StartsWith("WinExe", StringComparison.OrdinalIgnoreCase))
            {
                winexe.Add(e);
            }
            else if (shrt.StartsWith("Module", StringComparison.OrdinalIgnoreCase))
            {
                module.Add(e);
            }
            else // Library
            {
                lib.Add(e);
            }
        }

        var tests = exe.Where(e => e.NameWithoutExtension.Contains("Tests", StringComparison.OrdinalIgnoreCase));
        var exeWithoutTests = exe.Except(tests);
        return ([.. exeWithoutTests], [.. lib], [.. winexe], [.. module], [.. tests], [.. container]);
    }

    private class MyMpFileConterter(string? basePath) : JsonConverter<MPFile>
    {
        public override MPFile? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) => throw new NotImplementedException();
        public override void Write(Utf8JsonWriter writer, MPFile value, JsonSerializerOptions options)
            => writer.WriteStringValue(Path.GetRelativePath(basePath ?? ".", value.Path));
    }

    private class MyMpFolderConterter(string? basePath) : JsonConverter<Folder>
    {
        public override Folder? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) => throw new NotImplementedException();
        public override void Write(Utf8JsonWriter writer, Folder value, JsonSerializerOptions options)
            => writer.WriteStringValue(Path.GetRelativePath(basePath ?? ".", value.Path));
    }
}
