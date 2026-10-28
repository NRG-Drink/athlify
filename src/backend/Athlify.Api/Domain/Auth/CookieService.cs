namespace Athlify.Api.Domain.Auth;

public interface ICookieService
{
    string CookiePath { get; }
    string RefreshTokenCookieName { get; }

    string GetIpAddress(HttpContext httpContext);
    string? GetRefreshTokenCookie(HttpContext http);
    void SetRefreshTokenCookie(HttpContext http, TokenResponse tokenResponse);
    void DeleteRefreshTokenCookie(HttpContext http);
    CookieOptions GetRefreshTokenCookieOptions(DateTime expiresAt);
}

public class CookieService : ICookieService
{
    public string CookiePath { get; } = "/auth";
    public string RefreshTokenCookieName { get; } = "refreshToken";

    public string GetIpAddress(HttpContext httpContext)
        => httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    public string? GetRefreshTokenCookie(HttpContext http)
        => http.Request.Cookies.TryGetValue(RefreshTokenCookieName, out var rt)
            ? rt
            : null;

    public void SetRefreshTokenCookie(HttpContext http, TokenResponse tokenResponse)
    {
        var options = GetRefreshTokenCookieOptions(tokenResponse.ExpiresAt.UtcDateTime);
        http.Response.Cookies.Append(RefreshTokenCookieName, tokenResponse.Token, options);
    }

    public void DeleteRefreshTokenCookie(HttpContext http)
    {
        http.Response.Cookies.Delete(RefreshTokenCookieName, new CookieOptions { Path = CookiePath });
    }

    public CookieOptions GetRefreshTokenCookieOptions(DateTime expiresAt)
        => new()
        {
            HttpOnly = true,                          // invisible to JS (XSS protection)
            Secure = true,                            // HTTPS only
            SameSite = SameSiteMode.Strict,           // CSRF protection
            Expires = expiresAt,
            Path = CookiePath                         // scoped!
        };
}
