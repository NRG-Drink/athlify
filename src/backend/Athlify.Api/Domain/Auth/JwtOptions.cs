namespace Athlify.Api.Domain.Auth;

public class JwtOptions
{
    public const string SectionName = "Jwt";
    public string Issuer { get; init; } = "Athlify.Api";
    public string Audience { get; init; } = "Athlify.Webclient";
    public string SigningKey { get; init; } = "ReplaceThisWithASecretKeyOfAtLeast32Bytes!";
    public double LifetimeMinutes { get; init; } = 60;
    public double RefreshTokenLifetimeDays { get; init; } = 7;
    public double ClockSkewSeconds { get; init; } = 30;
}
