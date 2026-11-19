namespace Athlify.Api.Domain.Common;

public static class EnumStringResolver
{
    public static string ToString<TEnum>(TEnum value) where TEnum : struct, Enum 
        => Enum.GetName(typeof(TEnum), value) 
            ?? throw new ArgumentException($"Unknown {typeof(TEnum).Name} value: '{value}'.", nameof(value));

    public static TEnum Parse<TEnum>(string value) where TEnum : struct, Enum 
        => Enum.TryParse<TEnum>(value, ignoreCase: true, out var result)
            ? result
            : throw new ArgumentException($"Unknown {typeof(TEnum).Name} value: '{value}'.", nameof(value));

    public static bool TryParse<TEnum>(string? value, out TEnum result) where TEnum : struct, Enum 
        => Enum.TryParse(value, ignoreCase: true, out result);
}
