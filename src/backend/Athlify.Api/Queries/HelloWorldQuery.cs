namespace Athlify.Api.Types;

[QueryType]
public static partial class HelloWorldQuery
{
    public static string HelloPerson(string name = "World")
        => $"Hello {name}!";
}
