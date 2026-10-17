namespace Athlify.Api.Database;

/// <summary>Owner-scoped marker for idempotent development fixtures.</summary>
public class SeedMarker
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Key { get; set; } = string.Empty;
}
