using Athlify.Api.Domain.Common;
using Athlify.Api.Domain.Users;

namespace Athlify.Api.Tests;

public class EnumStringResolverTests
{
    [Test]
    public async Task ToStringReturnsEnumName()
    {
        await Assert.That(EnumStringResolver.ToString(UserRole.User)).IsEqualTo("User");
        await Assert.That(EnumStringResolver.ToString(UserRole.Admin)).IsEqualTo("Admin");
    }

    [Test]
    public async Task ParseAcceptsEnumNamesCaseInsensitively()
    {
        await Assert.That(EnumStringResolver.Parse<UserRole>("User")).IsEqualTo(UserRole.User);
        await Assert.That(EnumStringResolver.Parse<UserRole>("admin")).IsEqualTo(UserRole.Admin);
    }

    [Test]
    public async Task ParseRejectsUnknownValues()
    {
        var exception = await CaptureExceptionAsync(
            () => EnumStringResolver.Parse<UserRole>("Owner"));

        await Assert.That(exception).IsTypeOf<ArgumentException>();
        await Assert.That(exception.Message).Contains("Unknown UserRole value");
    }

    [Test]
    public async Task TryParseReturnsParsedValue()
    {
        var success = EnumStringResolver.TryParse<UserRole>("ADMIN", out var role);

        await Assert.That(success).IsTrue();
        await Assert.That(role).IsEqualTo(UserRole.Admin);
    }

    [Test]
    public async Task TryParseRejectsUnknownOrNullValues()
    {
        var unknown = EnumStringResolver.TryParse<UserRole>("Owner", out var unknownRole);
        var nullValue = EnumStringResolver.TryParse<UserRole>(null, out var nullRole);

        await Assert.That(unknown).IsFalse();
        await Assert.That(unknownRole).IsEqualTo(default(UserRole));
        await Assert.That(nullValue).IsFalse();
        await Assert.That(nullRole).IsEqualTo(default(UserRole));
    }

    private static async Task<Exception> CaptureExceptionAsync(Action action)
    {
        try
        {
            action();
        }
        catch (Exception exception)
        {
            return exception;
        }

        throw new InvalidOperationException("Expected an exception.");
    }
}
