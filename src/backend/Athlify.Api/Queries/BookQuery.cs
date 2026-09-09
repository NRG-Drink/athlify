using Athlify.Api.Models;

namespace Athlify.Api.Types;

[QueryType]
public static partial class BookQuery
{
    public static Book GetBook()
        => new("C# in depth.", new Author("Jon Skeet"));
}
