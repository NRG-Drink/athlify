using Athlify.Build.Modules.General;
using Microsoft.Extensions.Logging;
using ModularPipelines.Attributes;
using ModularPipelines.Configuration;
using ModularPipelines.Context;
using ModularPipelines.Models;
using ModularPipelines.Modules;
using System.Text;

namespace Athlify.Build.Modules.Dotnet;

[ModuleCategory(ModuleCategoryKey.TestReport)]
[RunOnServerOnly]
[DependsOn<FindRepoPaths>]
[DependsOn<DotnetTestReportGenerate>(Optional = true)]
[NotInParallel(NotInParallelKey.TestExecute)]
public class DotnetTestReportAppendToGitHubSummary : Module<bool>
{
    private const string GitHubStepSummaryEnvironmentVariable = "GITHUB_STEP_SUMMARY";
    private const long MaxFileSizeInBytes = 1 * 1024 * 1024; // 1MB

    protected override ModuleConfiguration Configure() => ModuleConfiguration.Create()
        .WithSkipWhen(async context =>
        {
            var repoPaths = await context.GetModule<FindRepoPaths>();
            var reportPath = repoPaths.ValueOrDefault!.TestReportGitHubSummary;
            var summaryPath = context.Environment.Variables.GetEnvironmentVariable(GitHubStepSummaryEnvironmentVariable);
            return summaryPath is null
                ? SkipDecision.Skip($"No Environmentvariable '{GitHubStepSummaryEnvironmentVariable}'")
                : reportPath.Exists
                    ? SkipDecision.DoNotSkip
                    : SkipDecision.Skip("No test report found");
        })
        .Build();

    protected override async Task<bool> ExecuteAsync(IModuleContext context, CancellationToken cancellationToken)
    {
        var repoPaths = await context.GetModule<FindRepoPaths>();
        try
        {
            var reportMarkdownSummary = await repoPaths.ValueOrDefault!.TestReportGitHubSummary.ReadAsync(cancellationToken);
            await WriteFileAsync(context, reportMarkdownSummary);

            return true;
        }
        catch
        {
            context.Logger.LogError("Failed to write report to GitHub Action Summary");
            return false;
        }
    }

    private static async Task WriteFileAsync(IPipelineContext pipelineContext, string content)
    {
        content = $"{content}\n";
        var stepSummaryVariable = pipelineContext.Environment.Variables.GetEnvironmentVariable("GITHUB_STEP_SUMMARY")!;
        var fileInfo = pipelineContext.Files.GetFile(stepSummaryVariable);
        var currentFileSize = fileInfo.Exists ? fileInfo.Length : 0;
        long newContentSize = Encoding.UTF8.GetByteCount(content);
        var newSize = currentFileSize + newContentSize;

        if (newSize > MaxFileSizeInBytes)
        {
            pipelineContext.Logger.LogError("Appending to the GitHub Step Summary would exceed the 1MB file size limit.");
            return;
        }

        await pipelineContext.Files.GetFile(stepSummaryVariable).AppendAsync(content);
    }
}
