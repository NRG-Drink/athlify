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
        var jwt = ValidateJwtOptions(jwtConfigSection);

        builder.Services
            .Configure<JwtOptions>(jwtConfigSection)
            .AddScoped<ITokenService, TokenService>()
            .AddScoped<ICookieService, CookieService>()
            .AddScoped<IHashService, HashService>()
            .AddScoped<ICurrentUser, CurrentUserFromHttpContext>();

        builder.Services
            .AddAuthorization(options =>
            {
                options.AddPolicy("Admin", policy => policy.RequireRole(UserRole.Admin));
                options.AddPolicy("User", policy => policy.RequireRole(UserRole.User));
            })
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    //ValidIssuer = jwt.Issuer,
                    ValidAudience = builder.Configuration[$"{JwtOptions.SectionName}:Audience"],
                    ValidateAudience = true,
                    //ValidAudience = jwt.Audience,
                    ValidIssuer = builder.Configuration[$"{JwtOptions.SectionName}:Issuer"],
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration[$"{JwtOptions.SectionName}:SigningKey"] ?? throw new InvalidOperationException("Jwt:SigningKey is not configured."))),
                    ValidateLifetime = true,
#if DEBUG
                    // Time tolerance for the expiration of the token.
                    ClockSkew = TimeSpan.FromSeconds(1),
#else
                    ClockSkew = TimeSpan.FromSeconds(30),
#endif
                };
            });

        return builder;
    }

    private static JwtOptions ValidateJwtOptions(IConfigurationSection config)
    {
        var jwtOptions = config.Get<JwtOptions>();
        ArgumentNullException.ThrowIfNull(jwtOptions, nameof(jwtOptions));
        if (Encoding.UTF8.GetByteCount(jwtOptions.SigningKey) < 32)
        {
            throw new InvalidOperationException("JWT signing key must be at least 32 bytes.");
        }

        return jwtOptions;
    }
}
