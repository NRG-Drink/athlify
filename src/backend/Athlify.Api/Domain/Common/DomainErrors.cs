namespace Athlify.Api.Domain.Common;

/// <summary>Error codes returned in <c>errors[].extensions.code</c>.</summary>
public static class DomainErrors
{
    public const string ValidationCode = "VALIDATION_ERROR";
    public const string NotAuthenticatedCode = "NOT_AUTHENTICATED";
    public const string CurrentPasswordIncorrectCode = "CURRENT_PASSWORD_INCORRECT";
    public const string ForbiddenCode = "FORBIDDEN";
    public const string UsernameTakenCode = "USERNAME_TAKEN";
    public const string LastAdminCode = "LAST_ADMIN";
    public const string CannotChangeOwnRoleCode = "CANNOT_CHANGE_OWN_ROLE";
    public const string CannotDeleteSelfCode = "CANNOT_DELETE_SELF";

    public static GraphQLException Validation(string message) =>
        new(ErrorBuilder.New().SetMessage(message).SetCode(ValidationCode).Build());

    public static GraphQLException CurrentPasswordIncorrect() =>
        WithField("The current password is incorrect.", CurrentPasswordIncorrectCode, "currentPassword");

    public static GraphQLException Forbidden() =>
        new(ErrorBuilder.New().SetMessage("Only administrators may do this.").SetCode(ForbiddenCode).Build());

    public static GraphQLException UsernameTaken() =>
        WithField("This username is already taken.", UsernameTakenCode, "username");

    public static GraphQLException LastAdmin() =>
        WithField("At least one administrator must remain.", LastAdminCode, "role");

    public static GraphQLException CannotChangeOwnRole() =>
        WithField("You cannot change your own role.", CannotChangeOwnRoleCode, "role");

    public static GraphQLException CannotDeleteSelf() =>
        new(ErrorBuilder.New()
            .SetMessage("You cannot delete your own account.")
            .SetCode(CannotDeleteSelfCode)
            .Build());

    public static GraphQLException NotAuthenticated() =>
        new(ErrorBuilder.New().SetMessage("No user is signed in.").SetCode(NotAuthenticatedCode).Build());

    private static GraphQLException WithField(string message, string code, string field) =>
        new(ErrorBuilder.New().SetMessage(message).SetCode(code).SetExtension("field", field).Build());
}

/// <summary>Collects validation messages so that a client sees every problem of an input at once.</summary>
public sealed class ValidationErrors
{
    private readonly List<IError> _errors = [];

    public void Add(string message) =>
        _errors.Add(ErrorBuilder.New().SetMessage(message).SetCode(DomainErrors.ValidationCode).Build());

    // Extra extensions carry values a client needs to word the rule, such as the limit that was broken.
    public void Add(string message, string field, string? rule = null, params (string Name, object Value)[] extensions)
    {
        var error = ErrorBuilder.New()
            .SetMessage(message)
            .SetCode(DomainErrors.ValidationCode)
            .SetExtension("field", field);
        if (rule is not null) error.SetExtension("rule", rule);
        foreach (var (name, value) in extensions) error.SetExtension(name, value);
        _errors.Add(error.Build());
    }

    public void AddIf(bool condition, string message)
    {
        if (condition) Add(message);
    }

    public void Text(string? value, string field, int maxLength, bool required)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            if (required) Add($"{field} is required.", field);
        }
        else if (value.Length > maxLength)
        {
            Add($"{field} must not be longer than {maxLength} characters.", field);
        }
    }

    public void ThrowIfAny()
    {
        if (_errors.Count > 0) throw new GraphQLException(_errors);
    }
}

public static class UtcDateTime
{
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
