using Athlify.Build.Modules.General;
using ModularPipelines.Attributes;
using ModularPipelines.Configuration;
using ModularPipelines.Context;
using ModularPipelines.Docker.Extensions;
using ModularPipelines.Docker.Options;
using ModularPipelines.GitHub.Extensions;
using ModularPipelines.Models;
using ModularPipelines.Modules;

namespace Athlify.Build.Modules.Docker;

[ModuleCategory(ModuleCategoryKey.Container)]
[RunOnServerOnly]
[DependsOn<FindRepoPaths>(Optional = true)]
[NotInParallel(NotInParallelKey.Container)]
public class DockerLogin : Module<string>
{
    protected override ModuleConfiguration Configure()
        => ModuleConfiguration.Create()
            .WithSkipWhen(async context =>
            {
                var repoTask = context.GetModuleIfRegistered<FindRepoPaths>();
                if (repoTask is not null)
                {
                    var maybeRepoPaths = await repoTask;
                    if (maybeRepoPaths.ValueOrDefault?.ContainerProjects.Count is 0)
                    {
                        return SkipDecision.Skip("No container projects found.");
                    }
                }

                var username = context.GitHub().EnvironmentVariables.Actor;
                var password = context.GitHub().EnvironmentVariables.Token;
                if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
                {
                    return SkipDecision.Skip("Docker username or password is not set in environment variables.");
                }

                return SkipDecision.DoNotSkip;
            })
            .Build();

    protected override async Task<string?> ExecuteAsync(IModuleContext context, CancellationToken cancellationToken)
    {
        var actor = context.GitHub().EnvironmentVariables.Actor;
        var token = context.GitHub().EnvironmentVariables.Token;

        var options = new DockerLoginOptions()
        {
            Username = actor,
            Password = token,
            Server = "ghcr.io"
        };

        var result = await context.Docker().Login(options, cancellationToken: cancellationToken);

        return result.StandardOutput;
    }
}
