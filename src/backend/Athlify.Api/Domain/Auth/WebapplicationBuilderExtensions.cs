using Athlify.Api.Domain.Users;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace Athlify.Api.Domain.Auth;

public static class WebapplicationBuilderExtensions
{
    public static WebApplicationBuilder AddAuth(this WebApplicationBuilder builder)
    {
        var jwtConfigSection = builder.Configuration.GetRequiredSection(JwtOptions.SectionName);

        builder.Services
            .AddHttpContextAccessor()
            .AddAuthorization(e => ConfigureAuthorizationOptions(e, builder.Configuration))
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(e => ConfigureJwtOptions(e, builder.Configuration));

        builder.Services
            .Configure<JwtOptions>(jwtConfigSection)
            .AddScoped<ITokenService, TokenService>()
            .AddScoped<ICookieService, CookieService>()
            .AddScoped<IHashService, HashService>()
            .AddScoped<ICurrentUser, CurrentUserFromHttpContext>();

        return builder;
    }

    private static void ConfigureAuthorizationOptions(
        Microsoft.AspNetCore.Authorization.AuthorizationOptions options,
        ConfigurationManager config)
    {
        options.AddPolicy("Admin", policy => policy.RequireRole(UserRole.Admin));
        options.AddPolicy("User", policy => policy.RequireRole(UserRole.User));
    }

    private static void ConfigureJwtOptions(JwtBearerOptions options, ConfigurationManager config)
    {
        var defaults = new JwtOptions();
        var jwtOptions = config.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? defaults;

        if (Encoding.UTF8.GetByteCount(jwtOptions.SigningKey) < 32)
        {
            throw new InvalidOperationException("JWT signing key must be at least 32 bytes.");
        }

        if (defaults.SigningKey == jwtOptions.SigningKey)
        {
            throw new InvalidOperationException("JWT signing key cannot be the default key, please change it.");
        }

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SigningKey));

        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidAudience = jwtOptions.Audience,
            ValidateAudience = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = securityKey,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(jwtOptions.ClockSkewSeconds),
        };
    }
}
