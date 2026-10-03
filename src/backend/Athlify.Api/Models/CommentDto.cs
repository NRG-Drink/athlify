using HotChocolate.Types.Relay;

namespace Athlify.Api.Models;

/// <summary>Client input for a note; identity, timestamps and ownership are set by the server.</summary>
public record CommentDto
{
    /// <summary>Global ID of an existing note; <c>null</c> for a new note.</summary>
    [ID<Comment>]
    public int? Id { get; set; }

    public string Content { get; set; } = string.Empty;
}
