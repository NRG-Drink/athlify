namespace Athlify.Api.Domain.Common;

/// <summary>Error codes returned in <c>errors[].extensions.code</c>.</summary>
public static class DomainErrors
{
    public const string ValidationCode = "VALIDATION_ERROR";
    public const string NotAuthenticatedCode = "NOT_AUTHENTICATED";

    public static GraphQLException Validation(string message) =>
        new(ErrorBuilder.New().SetMessage(message).SetCode(ValidationCode).Build());

    public static GraphQLException NotAuthenticated() =>
        new(ErrorBuilder.New().SetMessage("No user is signed in.").SetCode(NotAuthenticatedCode).Build());
}

/// <summary>Collects validation messages so that a client sees every problem of an input at once.</summary>
public sealed class ValidationErrors
{
    private readonly List<IError> _errors = [];

    public void Add(string message) =>
        _errors.Add(ErrorBuilder.New().SetMessage(message).SetCode(DomainErrors.ValidationCode).Build());

    public void AddIf(bool condition, string message)
    {
        if (condition) Add(message);
    }

    /// <summary>Adds an error when a text is required but empty, or longer than <paramref name="maxLength"/>.</summary>
    public void Text(string? value, string field, int maxLength, bool required)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            AddIf(required, $"{field} is required.");
        }
        else if (value.Length > maxLength)
        {
            Add($"{field} must not be longer than {maxLength} characters.");
        }
    }

    public void ThrowIfAny()
    {
        if (_errors.Count > 0) throw new GraphQLException(_errors);
    }
}

public static class UtcDateTime
{
    /// <summary>Npgsql only writes UTC values to <c>timestamptz</c>; inputs with an offset are converted.</summary>
    public static DateTime Normalize(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Local => value.ToUniversalTime(),
        _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
    };

    public static DateTime? Normalize(DateTime? value) => value is null ? null : Normalize(value.Value);
}

/// <summary>Trims optional text and maps blank input to <c>null</c>.</summary>
public static class Text
{
    public static string? OrNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
