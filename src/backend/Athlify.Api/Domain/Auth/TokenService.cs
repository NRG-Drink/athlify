using Athlify.Api.Database;
using Athlify.Api.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace Athlify.Api.Domain.Auth;

public interface ITokenService
{
    TokenResponse GenerateAccessToken(User dbUser);
    Task<TokenResponse> GenerateRefreshTokenAsync(User user, string ip, RefreshToken? stored);
    Task RevokeTokenFamily(Guid familyId, string ip, RefreshToken.RevokeReason reason = RefreshToken.RevokeReason.ReuseDetected);
    Task<(TokenResponse Token, User User)> RotateRefreshTokenOrThrow(HttpContext httpContext);
}

public class TokenService(
    IOptions<JwtOptions> jwtOptions,
    ICookieService cookieService,
    IHashService hashService,
    AthlifyDbContext db) 
    : ITokenService
{
    public TokenResponse GenerateAccessToken(User dbUser)
    {
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(jwtOptions.Value.LifetimeMinutes);
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, dbUser.Username),
            new Claim(ClaimTypes.Email, dbUser.Username),
            new Claim(ClaimTypes.Role, dbUser.Role),
        };

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Value.SigningKey));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);
        var jwt = new JwtSecurityToken(
            jwtOptions.Value.Issuer,
            jwtOptions.Value.Audience,
            claims,
            expires: expiresAt.UtcDateTime,
            signingCredentials: credentials);
        var accessToken = new JwtSecurityTokenHandler().WriteToken(jwt);

        return new TokenResponse(accessToken, expiresAt);
    }

    public async Task<TokenResponse> GenerateRefreshTokenAsync(User user, string ip, RefreshToken? stored)
    {
        var newRawToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        var newRefreshToken = new RefreshToken
        {
            TokenHash = hashService.HashToken(newRawToken),
            FamilyId = stored?.FamilyId ?? Guid.NewGuid(),          // same family!
            UserId = stored?.UserId ?? user.Id,
            Created = DateTime.UtcNow,
            CreatedByIp = ip,
            ExpiresAt = DateTime.UtcNow.AddDays(jwtOptions.Value.RefreshTokenLifetimeDays),
            ParentTokenId = stored?.Id
        };

        stored?.Revoked = DateTime.UtcNow;
        stored?.RevokedByIp = ip;
        stored?.ReasonRevoked = RefreshToken.RevokeReason.Rotated;

        var entity = await db.RefreshTokens.AddAsync(newRefreshToken);
        await db.SaveChangesAsync();

        return new(newRawToken, entity.Entity.ExpiresAt);
    }

    public async Task<(TokenResponse Token, User User)> RotateRefreshTokenOrThrow(HttpContext httpContext)
    {
        var ip = cookieService.GetIpAddress(httpContext);
        var oldRefreshToken = cookieService.GetRefreshTokenCookie(httpContext)
            ?? throw new UnauthorizedAccessException("Refresh token not found.");
        var oldTokenHash = hashService.HashToken(oldRefreshToken);
        var stored = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == oldTokenHash)
            // Unknown token → forged/garbage → plain rejection
            ?? throw new UnauthorizedAccessException("Refresh token not found in database.");

        // Check if the old token has been revoked (indicating reuse)
        if (stored.Revoked is not null)
        {
            await RevokeTokenFamily(stored.FamilyId, ip);
            cookieService.DeleteRefreshTokenCookie(httpContext);
            throw new UnauthorizedAccessException("Refresh token reuse detected. All tokens in this family have been revoked.");
        }

        if (stored.IsExpired)
        {
            throw new UnauthorizedAccessException("Refresh token has expired.");
        }

        var user = await db.Users
            .IgnoreQueryFilters([AthlifyDbContext.OwnerFilter])
            .FirstOrDefaultAsync(u => u.Id == stored.UserId)
            ?? throw new UnauthorizedAccessException("User not found for the provided refresh token.");

        var refreshTokenResponse = await GenerateRefreshTokenAsync(user, ip, stored);
        return (refreshTokenResponse, user);
    }

    public async Task RevokeTokenFamily(
        Guid familyId,
        string ip,
        RefreshToken.RevokeReason reason = RefreshToken.RevokeReason.ReuseDetected)
    {
        await db.RefreshTokens
            .Where(t => t.FamilyId == familyId && t.Revoked == null)
            .ExecuteUpdateAsync(s => s
                .SetProperty(t => t.Revoked, DateTime.UtcNow)
                .SetProperty(t => t.RevokedByIp, ip)
                .SetProperty(t => t.ReasonRevoked, reason));

        await db.SaveChangesAsync();
    }
}

