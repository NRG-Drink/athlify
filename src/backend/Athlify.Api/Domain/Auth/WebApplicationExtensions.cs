namespace Athlify.Api.Domain.Auth;

public static class WebApplicationExtensions
{
    public static WebApplication UseAuth(this WebApplication app)
    {
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapGroup("/auth").MapAuthEndpoints();

        return app;
    }
}
