using HotChocolate.Types.Relay;

namespace Athlify.Api.Models;

public record Comment
{
    [ID]
    public int Id { get; set; }
    public Guid Uid { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ModifiedAt { get; set; } = DateTime.UtcNow;
    public string Content { get; set; } = string.Empty;
}
