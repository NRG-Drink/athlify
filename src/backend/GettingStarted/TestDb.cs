using GettingStarted.Types;
using Microsoft.EntityFrameworkCore;

namespace GettingStarted;

public class TestDb : DbContext
{
    public TestDb(DbContextOptions<TestDb> options) : base(options) { }
    
    public DbSet<Book> Books => Set<Book>();
    public DbSet<Author> Authors => Set<Author>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Book>()
            .HasOne(b => b.Author)
            .WithMany()
            .HasForeignKey("AuthorId");
    }
}

public static class DbSeeder
{
    private static Author MartinSuter = new Author { FirstName = "Martin", LastName = "Suter" };
    private static Author IngridNoll = new Author { FirstName = "Ingrid", LastName = "Noll" };

    public static void Seed(TestDb db)
    {
        // Add Authors
        var author1 = db.Authors.Add(MartinSuter);
        var author2 = db.Authors.Add(IngridNoll);
        var martinSuter = author1.Entity;
        var ingridNoll = author2.Entity;

        // Add Books
        db.Books.Add(new Book { Title = "Der Koch", Format = "hardcover", Author = martinSuter });
        db.Books.Add(new Book { Title = "Melody", Format = "paperback", Author = martinSuter });
        db.Books.Add(new Book { Title = "Die dunkle Seite des Mondes", Format = "hardcover", Author = martinSuter });
        db.Books.Add(new Book { Title = "Elefant", Format = "paperback", Author = martinSuter });

        db.Books.Add(new Book { Title = "Die Apothekerin", Format = "hardcover", Author = ingridNoll });
        db.Books.Add(new Book { Title = "Die Häupter meiner Lieben", Format = "paperback", Author = ingridNoll });
        db.Books.Add(new Book { Title = "Die Apothekerin", Format = "paperback", Author = ingridNoll });

        db.SaveChanges();
    }
}

public class Book
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string Format { get; set; } = null!;
    public Author Author { get; set; } = null!;
}

public class  Author
{
    public int Id { get; set; }
    public required string FirstName { get; set; }
    public required string LastName { get; set; }
}
