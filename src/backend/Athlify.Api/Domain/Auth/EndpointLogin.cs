using Athlify.Api.Database;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace Athlify.Api.Domain.Auth;

public class EndpointLogin
{
    public async Task<IResult> HandleLogin(
        LoginInput input,
        HttpContext httpContext,
        [Service] ITokenService tokenService,
        [Service] ICookieService cookieService,
        [Service] IHashService hashService,
        [Service] AthlifyDbContext db)
    {
        try
        {
            var dbUser = await db.Users
                .IgnoreQueryFilters([AthlifyDbContext.OwnerFilter])
                .FirstOrDefaultAsync(u => u.Username == input.Username);

            var inputPasswordHash = hashService.HashPassword(input.Password);
            var isPasswordValid = IsPasswordValid(inputPasswordHash, dbUser?.PasswordHash);
            if (!isPasswordValid)
            {
                return Results.Unauthorized();
            }

            var ipAddress = cookieService.GetIpAddress(httpContext);
            var accessToken = tokenService.GenerateAccessToken(dbUser!);
            var refreshToken = await tokenService.GenerateRefreshTokenAsync(dbUser!, ipAddress);
            var cookieOptions = cookieService.GetRefreshTokenCookieOptions(refreshToken.ExpiresAt.DateTime);
            cookieService.SetRefreshTokenCookie(httpContext, refreshToken);

            return Results.Ok(accessToken);
        }
        catch (Exception)
        {
            var error = new Exception("An error occurred while processing the request.");
            return Results.InternalServerError(error);
        }
    }

    private static bool IsPasswordValid(string? pwHash1, string? pwHash2)
    {
        if (pwHash1 is null || pwHash2 is null)
        {
            return false;
        }

        var pw1 = Encoding.UTF8.GetBytes(pwHash1);
        var pw2 = Encoding.UTF8.GetBytes(pwHash2);
        var isPasswordMatch = CryptographicOperations.FixedTimeEquals(pw2, pw1);

        return isPasswordMatch;
    }
}
