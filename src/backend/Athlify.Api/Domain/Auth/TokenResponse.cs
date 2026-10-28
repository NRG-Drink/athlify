namespace Athlify.Api.Domain.Auth;

public record TokenResponse(string Token, DateTimeOffset ExpiresAt);
