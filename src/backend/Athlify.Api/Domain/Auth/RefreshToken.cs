using Athlify.Api.Domain.Common;
using Athlify.Api.Domain.Users;
using System.ComponentModel.DataAnnotations.Schema;

namespace Athlify.Api.Domain.Auth;

public class RefreshToken : Entity, IOwned
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public string TokenHash { get; set; } = null!;

    public Guid FamilyId { get; set; }

    public DateTime Created { get; set; }
    public string CreatedByIp { get; set; } = null!;
    public DateTime ExpiresAt { get; set; }

    public DateTime? Revoked { get; set; }
    public string? RevokedByIp { get; set; }
    public RevokeReason? ReasonRevoked { get; set; } 

    public int? ParentTokenId { get; set; }
    public RefreshToken? ParentToken { get; set; }

    [NotMapped] public bool IsExpired => DateTime.UtcNow >= ExpiresAt;
    [NotMapped] public bool IsActive => Revoked is null && !IsExpired;

    public enum RevokeReason
    {
        Rotated,
        ReuseDetected,
        Logout
    }
}
