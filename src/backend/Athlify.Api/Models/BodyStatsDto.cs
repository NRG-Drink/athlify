namespace Athlify.Api.Models;

/// <summary>Client input for creating or updating a <see cref="BodyStats"/> entry.</summary>
public record BodyStatsDto
{
    public DateTime Date { get; set; }
    public double Weight { get; set; }
    public double BodyFatPercentage { get; set; }
    public double MusclePercentage { get; set; }
    public double WaterPercentage { get; set; }
    public double BoneMass { get; set; }

    /// <summary>
    /// The complete list of notes. On update, notes with an <see cref="CommentDto.Id"/> are edited,
    /// notes without one are added and existing notes missing from the list are removed.
    /// </summary>
    public IReadOnlyList<CommentDto> Comments { get; set; } = [];
}
