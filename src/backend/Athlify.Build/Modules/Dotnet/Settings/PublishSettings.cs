using ModularPipelines.DotNet.Options;
using ModularPipelines.Extensions;
using ModularPipelines.FileSystem;
using MPFile = ModularPipelines.FileSystem.File;

namespace Athlify.Build.Modules.Dotnet.Settings;

public class PublishSettings
{
    private readonly List<PublishProjectHook> _publishHooks = new();
    public DotNetPublishOptions DefaultOptions { get; set; } = new()
    {
        Configuration = "Release",
        Runtime = DotNetRidCatalog.Linux.LinuxX64,
        Arguments = [],
        Properties = [],
    };

    public PublishSettings AddFindProject(
        Func<MPFile, bool> isProject,
        Func<DotNetPublishOptions, DotNetPublishOptions> changeProject)
    {
        _publishHooks.Add(new PublishProjectHook(isProject, changeProject));
        return this;
    }

    public PublishProject[] GetExeProjects(IEnumerable<MPFile> projectFiles, string version, Folder outDir)
    {
        return GetProjects(projectFiles, version, outDir, options => AddExeVersion(options, version), false);
    }

    public PublishProject[] GetContainerProjects(IEnumerable<MPFile> projectFiles, string version, Folder outDir)
    {
        return GetProjects(projectFiles, version, outDir, options => AddContainerVersion(options, version), true);
    }

    private static DotNetPublishOptions AddContainerVersion(DotNetPublishOptions options, string version)
    {
        return (DotNetPublishOptions)options.WithArguments($"-p:ContainerImageTag={version}");
    }

    private static DotNetPublishOptions AddExeVersion(DotNetPublishOptions options, string version)
    {
        var publishOptions = options with
        {
            Properties = options.Properties ?? [],
        };

        publishOptions.Properties = publishOptions.Properties
            .Append(("PackageVersion", version))
            .Append(("Version", version))
            .ToArray();

        return publishOptions;
    }

    private PublishProject[] GetProjects(
        IEnumerable<MPFile> projectFiles,
        string version,
        Folder outDir,
        Func<DotNetPublishOptions, DotNetPublishOptions> addVersionFunc,
        bool isContainer)
    {
        var projects = new List<PublishProject>();
        foreach (var projectFile in projectFiles)
        {
            var isAdded = false;
            var publishProject = DefaultOptions with
            {
                ProjectSolution = projectFile.Path,
                Output = Path.Combine(outDir.Path, $"{projectFile.NameWithoutExtension}_v{version}")
            };
            publishProject = addVersionFunc(publishProject);

            foreach (var hook in _publishHooks)
            {
                if (hook.IsProject(projectFile))
                {
                    isAdded = true;
                    publishProject = hook.ChangeProject(publishProject with { });

                    var project = new PublishProject(projectFile, publishProject, isContainer);
                    projects.Add(project);
                }
            }

            if (!isAdded)
            {
                var project = new PublishProject(projectFile, publishProject, isContainer);
                projects.Add(project);
            }
        }

        return [.. projects];
    }

    public record PublishProjectHook(Func<MPFile, bool> IsProject, Func<DotNetPublishOptions, DotNetPublishOptions> ChangeProject);
}
