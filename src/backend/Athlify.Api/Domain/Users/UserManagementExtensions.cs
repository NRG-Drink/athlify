namespace Athlify.Api.Domain.Users;

public static class UserManagementExtensions
{
    public static WebApplicationBuilder AddUserManagement(this WebApplicationBuilder builder)
    {
        builder.Services
            .AddSingleton<AdminUsers>()
            .AddSingleton<UserAdminRules>()
            .AddSingleton<UpdateMeValidation>()
            .AddSingleton<UserAdminValidation>()
            .AddSingleton<UserDataDeletion>()
            .AddScoped<DevelopmentUserProvisioner>()
            .AddScoped<UserQuery>()
            .AddScoped<UserNode>()
            .AddScoped<UserAdminQuery>()
            .AddScoped<UserMutation>()
            .AddScoped<UserAdminMutation>();

        return builder;
    }
}
