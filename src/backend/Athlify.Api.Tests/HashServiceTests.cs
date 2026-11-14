using Athlify.Api.Domain.Auth;

namespace Athlify.Api.Tests;

public class HashServiceTests
{
    private readonly HashService _hashService = new();

    [Test]
    public async Task VerifyPasswordAcceptsTheHashedPassword()
    {
        var hash = _hashService.HashPassword("secret");

        await Assert.That(_hashService.VerifyPassword("secret", hash)).IsTrue();
    }

    [Test]
    public async Task VerifyPasswordRejectsAnotherPassword()
    {
        var hash = _hashService.HashPassword("secret");

        await Assert.That(_hashService.VerifyPassword("Secret", hash)).IsFalse();
    }

    [Test]
    public async Task VerifyPasswordRejectsAMissingHash()
    {
        await Assert.That(_hashService.VerifyPassword("secret", null)).IsFalse();
    }
}
