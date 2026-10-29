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
    Task<TokenResponse> GenerateRefreshTokenAsync(User user, string ip);
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
            new Claim(ClaimTypes.NameIdentifier, dbUser.Id.ToString()),
            new Claim(ClaimTypes.Name, dbUser.Username),
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

    public async Task<TokenResponse> GenerateRefreshTokenAsync(User user, string ip)
    {
        var (rawToken, refreshToken) = GetRefreshToken(user.Id, ip);

        var entity = await db.RefreshTokens.AddAsync(refreshToken);
        await db.SaveChangesAsync();

        return new(rawToken, entity.Entity.ExpiresAt);
    }

    private (string RawToken, RefreshToken RefreshToken) GetRefreshToken(
        int userId,
        string ip,
        RefreshToken? parentToken = null)
    {
        var newRawToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        var now = DateTime.UtcNow;
        var newRefreshToken = new RefreshToken
        {
            TokenHash = hashService.HashToken(newRawToken),
            FamilyId = parentToken?.FamilyId ?? Guid.NewGuid(),
            UserId = parentToken?.UserId ?? userId,
            Created = now,
            CreatedByIp = ip,
            ExpiresAt = now.AddDays(jwtOptions.Value.RefreshTokenLifetimeDays),
            ParentTokenId = parentToken?.Id
        };

        return (newRawToken, newRefreshToken);
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
    }

    public async Task<(TokenResponse Token, User User)> RotateRefreshTokenOrThrow(HttpContext httpContext)
    {
        var ip = cookieService.GetIpAddress(httpContext);
        var cookieToken = cookieService.GetRefreshTokenCookie(httpContext)
            ?? throw new UnauthorizedAccessException("Refresh token not found.");
        var cookieHash = hashService.HashToken(cookieToken);
        var storedToken = await db.RefreshTokens.AsNoTracking().FirstOrDefaultAsync(t => t.TokenHash == cookieHash)
            // Unknown token → forged/garbage → plain rejection
            ?? throw new UnauthorizedAccessException("Refresh token not found in database.");

        var user = await db.Users
            .IgnoreQueryFilters([AthlifyDbContext.OwnerFilter])
            .FirstOrDefaultAsync(u => u.Id == storedToken.UserId)
            ?? throw new UnauthorizedAccessException("User not found for the provided refresh token.");

        var (newRawToken, newRefreshToken) = GetRefreshToken(user.Id, ip, storedToken);

        var isRotateSuccess = await TryRotateToken(ip, storedToken, newRefreshToken);
        if (!isRotateSuccess)
        {
            await ThrowNotRotated(httpContext, ip, storedToken.Id);
        }

        return (new(newRawToken, newRefreshToken.ExpiresAt), user);
    }

    private async Task<bool> TryRotateToken(
        string ip,
        RefreshToken stored,
        RefreshToken newRefreshToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();
        var affectedRows = await db.RefreshTokens
            .Where(t => t.Id == stored.Id && t.Revoked == null && t.ExpiresAt > newRefreshToken.Created)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(t => t.Revoked, newRefreshToken.Created)
                .SetProperty(t => t.RevokedByIp, ip)
                .SetProperty(t => t.ReasonRevoked, RefreshToken.RevokeReason.Rotated));

        if (affectedRows > 1)
        {
            throw new InvalidOperationException("Refresh-token consumption affected more than one row.");
        }

        if (affectedRows == 1)
        {
            await db.RefreshTokens.AddAsync(newRefreshToken);
            await db.SaveChangesAsync();
            await transaction.CommitAsync();
            return true;
        }

        await transaction.RollbackAsync();
        return false;
    }

    private async Task ThrowNotRotated(
        HttpContext httpContext,
        string ip,
        int tokenId)
    {
        var currentToken = await db.RefreshTokens
            .AsNoTracking()
            .FirstOrDefaultAsync(token => token.Id == tokenId);

        if (currentToken?.Revoked is not null)
        {
            await RevokeTokenFamily(currentToken.FamilyId, ip);
            cookieService.DeleteRefreshTokenCookie(httpContext);
            throw new UnauthorizedAccessException("Refresh token reuse detected. All tokens in this family have been revoked.");
        }

        if (currentToken is null)
        {
            throw new UnauthorizedAccessException("Refresh token not found in database.");
        }

        if (currentToken.IsExpired)
        {
            throw new UnauthorizedAccessException("Refresh token has expired.");
        }

        throw new InvalidOperationException("Active refresh token could not be consumed.");
    }
}
