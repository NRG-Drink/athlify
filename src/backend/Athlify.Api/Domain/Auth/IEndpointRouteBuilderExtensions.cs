namespace Athlify.Api.Domain.Auth;

public static class IEndpointRouteBuilderExtensions
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder builder)
    {
        var login = new EndpointLogin();
        builder.MapPost("/login", login.HandleLogin).AllowAnonymous();

        var refresh = new EndpointRefresh();
        builder.MapPost("/refresh", refresh.HandleRefresh).AllowAnonymous();

        var logout = new EndpointLogout();
        builder.MapPost("/logout", logout.HandleLogout).AllowAnonymous();

        return builder;
    }
}
