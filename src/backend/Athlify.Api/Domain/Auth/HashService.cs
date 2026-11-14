using System.Security.Cryptography;
using System.Text;

namespace Athlify.Api.Domain.Auth;

public interface IHashService
{
    string HashPassword(string password);

    /// <summary>Compares in constant time; <c>false</c> when the account has no password hash.</summary>
    bool VerifyPassword(string password, string? storedHash);

    string HashToken(string token);
}

public class HashService : IHashService
{
    public string HashPassword(string password)
    {
        var passwordBytes = Encoding.UTF8.GetBytes(password);
        var passwordHashBytes = SHA256.HashData(passwordBytes);
        return Convert.ToBase64String(passwordHashBytes);
    }

    public bool VerifyPassword(string password, string? storedHash)
    {
        // Hash before the null check so an unknown account costs the same as a wrong password.
        var inputBytes = Encoding.UTF8.GetBytes(HashPassword(password));
        if (storedHash is null)
        {
            return false;
        }

        var storedBytes = Encoding.UTF8.GetBytes(storedHash);
        return CryptographicOperations.FixedTimeEquals(inputBytes, storedBytes);
    }

    public string HashToken(string rawToken)
    {
        var tokenBytes = Encoding.UTF8.GetBytes(rawToken);
        var tokenHashBytes = SHA256.HashData(tokenBytes);
        var tokenHashHex = Convert.ToHexString(tokenHashBytes);
        return tokenHashHex;
    }
}

