using Athlify.Api.Domain.Common;

namespace Athlify.Api.Domain.Users;

public static class UserAdminRules
{
    public static void CheckDelete(int callerId, int targetId)
    {
        if (targetId == callerId)
        {
            throw DomainErrors.CannotDeleteSelf();
        }
    }

    public static void CheckRoleChange(int callerId, User target, UserRole newRole, int adminCount)
    {
        if (newRole == target.Role)
        {
            return;
        }

        if (target.Id == callerId)
        {
            throw DomainErrors.CannotChangeOwnRole();
        }

        if (target.Role == UserRole.Admin && adminCount <= 1)
        {
            throw DomainErrors.LastAdmin();
        }
    }
}
