namespace Athlify.Build.Common;

public record PathCommandResult<T>(T? Path, ModularPipelines.Models.CommandResult CommandResult);
