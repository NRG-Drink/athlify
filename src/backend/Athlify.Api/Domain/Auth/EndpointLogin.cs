using Athlify.Api.Database;
using Microsoft.EntityFrameworkCore;

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
        if (string.IsNullOrWhiteSpace(input.Username) || string.IsNullOrWhiteSpace(input.Password))
        {
            return Results.Unauthorized();
        }

        try
        {
            var dbUser = await db.Users
                .IgnoreQueryFilters([AthlifyDbContext.OwnerFilter])
                .FirstOrDefaultAsync(u => u.Username == input.Username);

            var isPasswordValid = hashService.VerifyPassword(input.Password, dbUser?.PasswordHash);
            if (!isPasswordValid)
            {
                return Results.Unauthorized();
            }

            var ipAddress = cookieService.GetIpAddress(httpContext);
            var accessToken = tokenService.GenerateAccessToken(dbUser!);
            var refreshToken = await tokenService.GenerateRefreshTokenAsync(dbUser!, ipAddress);
            cookieService.SetRefreshTokenCookie(httpContext, refreshToken);

            return Results.Ok(accessToken);
        }
        catch (Exception)
        {
            var error = new Exception("An error occurred while processing the request.");
            return Results.InternalServerError(error);
        }
    }
}
