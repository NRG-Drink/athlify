using Athlify.Api.Domain.Common;

namespace Athlify.Api.Domain.Users;

/// <summary>
/// The signed-in user of the current request. Every ownership check reads the user from here, so the
/// authentication feature only has to provide another implementation.
/// </summary>
public interface ICurrentUser
{
    /// <summary>Internal id of the signed-in user.</summary>
    /// <exception cref="GraphQLException">With code <c>NOT_AUTHENTICATED</c> when nobody is signed in.</exception>
    int UserId { get; }
}

/// <summary>
/// Until authentication exists, every request acts as the development user that
/// <see cref="DevelopmentUserProvisioner"/> creates at startup.
/// </summary>
public sealed class DevelopmentCurrentUser : ICurrentUser
{
    private int? _userId;

    public int UserId
    {
        get => _userId ?? throw DomainErrors.NotAuthenticated();
        set => _userId = value;
    }
}
