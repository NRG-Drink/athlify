namespace Athlify.Api.Database;

/// <summary>Configuration section <c>Athlify:Seed</c>.</summary>
public class SeedOptions
{
    public const string Section = "Athlify:Seed";

    /// <summary>Writes sample data for the development user at startup. Off unless configured.</summary>
    public bool Enabled { get; set; }
}
