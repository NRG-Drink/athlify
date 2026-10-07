using Athlify.Api.Domain.Common;

namespace Athlify.Api.Domain.Body;

/// <summary>The note of a <see cref="BodyStats"/> entry; owned through that entry.</summary>
public class Comment : Entity
{
    public string Content { get; set; } = string.Empty;
}
