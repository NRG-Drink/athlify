using System.Security.Cryptography;
using System.Text;

namespace Athlify.Api.Domain.Auth;

public interface IHashService
{
    string HashPassword(string password);
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

    public string HashToken(string rawToken)
    {
        var tokenBytes = Encoding.UTF8.GetBytes(rawToken);
        var tokenHashBytes = SHA256.HashData(tokenBytes);
        var tokenHashHex = Convert.ToHexString(tokenHashBytes);
        return tokenHashHex;
    }
}

