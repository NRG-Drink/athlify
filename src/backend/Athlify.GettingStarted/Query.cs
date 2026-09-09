using GreenDonut.Data;
using HotChocolate.Types.Pagination;
using Microsoft.EntityFrameworkCore;

namespace GettingStarted.Types;

[QueryType]
public static partial class Query
{
    public static string SayHello(string name = "world")
        => $"hello, {name}!";
}

[QueryType]
public static partial class Query
{
    public static async Task<Book?> GetBookById(
        int id,
        QueryContext<Book> query,
        TestDb db,
        CancellationToken cancellationToken)
    {
        return await db.Books
            .With(query.Include(e => e.Id))
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
    }

    [UsePaging]
    [UseFiltering]
    public static async Task<Connection<Book>> GetBooks(
        PagingArguments pagingArgs,
        QueryContext<Book> query,
        TestDb db,
        CancellationToken cancellationToken)
    {
        return
            await
            db.Books
            .OrderBy(b => b.Id)
            .With(query)
            .ToPageAsync(pagingArgs, cancellationToken)
            .ToConnectionAsync();
    }
}

public class BookNameInvalidException(string message, string prop) : Exception(message)
{
    public string Prop { get; } = prop;
}

public class BookFormatInvalidException(string message, string? prop = null) : Exception(message)
{
    public string Prop { get; } = prop ?? "Custom";
}

[MutationType]
public static partial class BookMutation
{
    [Error(typeof(BookNameInvalidException))]
    [Error(typeof(BookFormatInvalidException))]
    public static async Task<Book> CreateBook(
        CreateBookInput input,
        TestDb db,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(input.Title))
        {
            throw new BookNameInvalidException("Title cannot be empty.", "Title");
        }

        if (string.IsNullOrWhiteSpace(input.Format))
        {
            throw new BookFormatInvalidException("Format cannot be empty.", "Format");
        }

        if (input.Format == "error")
        {
            // Just for testing an undeclared exception.
            throw new Exception("Unnamed Error");
        }

        var book = new Book
        {
            Title = input.Title,
            Format = input.Format,
        };

        db.Books.Add(book);
        await db.SaveChangesAsync(cancellationToken);

        return book;
    }

    public record CreateBookInput(string Title, string Format);
}
