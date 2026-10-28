namespace Athlify.Api.Domain.Auth;

public class EndpointRefresh
{
    public async Task<IResult> HandleRefresh(
        HttpContext httpContext,
        [Service] ITokenService tokenService,
        [Service] ICookieService cookieService)
    {
        try
        {
            var (rotatedRefreshToken, user) = await tokenService.RotateRefreshTokenOrThrow(httpContext);
            var accessToken = tokenService.GenerateAccessToken(user);

            var cookieOptions = cookieService.GetRefreshTokenCookieOptions(rotatedRefreshToken.ExpiresAt.DateTime);
            cookieService.SetRefreshTokenCookie(httpContext, rotatedRefreshToken);

            return Results.Ok(accessToken);
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Unauthorized();
        }
        catch (Exception)
        {
            var error = new Exception("An error occurred while processing the request.");
            return Results.InternalServerError(error);
        }
    }
}
