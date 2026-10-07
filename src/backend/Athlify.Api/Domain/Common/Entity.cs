using HotChocolate.Types.Relay;

namespace Athlify.Api.Domain.Common;

/// <summary>
/// Identity and system timestamps shared by every domain entity. <see cref="AthlifyDbContext"/> sets
/// the timestamps when it saves; clients never send them.
/// </summary>
public abstract class Entity
{
    [ID]
    public int Id { get; set; }
    public Guid Uid { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ModifiedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// A record that belongs to exactly one user. The owner query filter hides other users' records and
/// <see cref="AthlifyDbContext"/> sets <see cref="UserId"/> when a new record is saved.
/// </summary>
public interface IOwned
{
    int UserId { get; set; }
}
