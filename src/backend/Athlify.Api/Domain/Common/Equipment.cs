namespace Athlify.Api.Domain.Common;

/// <summary>
/// What a bicycle and a gadget have in common. It is not an entity of its own: each subclass keeps its own
/// table, so there is no shared table and no inheritance mapping.
/// </summary>
public abstract class Equipment : Entity, IOwned
{
    [GraphQLIgnore]
    public int UserId { get; set; }

    public string Brand { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string? Nickname { get; set; }
    public DateOnly? PurchaseDate { get; set; }
    public string? Description { get; set; }
    public DateOnly? DeactivationDate { get; set; }
    public decimal? Price { get; set; }
    public Source Source { get; set; } = Source.Manual;
}
