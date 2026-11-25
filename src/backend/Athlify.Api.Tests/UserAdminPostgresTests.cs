using Athlify.Api.Database;
using Athlify.Api.Domain.Activities;
using Athlify.Api.Domain.Auth;
using Athlify.Api.Domain.Body;
using Athlify.Api.Domain.Common;
using Athlify.Api.Domain.Events;
using Athlify.Api.Domain.Gadgets;
using Athlify.Api.Domain.Tags;
using Athlify.Api.Domain.Vehicles;
using Athlify.Api.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TUnit.Core;
using static Athlify.Api.Tests.GraphQl;

namespace Athlify.Api.Tests;

/// <summary>Admin user management on PostgreSQL, where the serializable transaction of a role change is enforced.</summary>
public class UserAdminPostgresTests
{
    private const string UpdateUser = """
        mutation($id: ID!, $input: UpdateUserInput!) {
          updateUser(id: $id, input: $input) { id role }
        }
        """;

    [Test]
    public async Task ConcurrentDemotionsOfTwoAdministratorsLeaveOneAdministrator()
    {
        Skip.Unless(PostgresWebApplicationFactory.IsConfigured,
            $"Set {PostgresWebApplicationFactory.ConnectionVariable} to run the PostgreSQL tests.");
        await using var factory = new PostgresWebApplicationFactory();

        await DemoteSeededAdministratorsAsync(factory);
        var ada = await CreateAdminAsync(factory, "ada@example.com");
        var bo = await CreateAdminAsync(factory, "bo@example.com");
        var adaId = await GlobalIdAsync(ada, "ada@example.com");
        var boId = await GlobalIdAsync(ada, "bo@example.com");

        var results = await Task.WhenAll(
            PostAsync(ada, UpdateUser, new { id = boId, input = new { role = "USER" } }),
            PostAsync(bo, UpdateUser, new { id = adaId, input = new { role = "USER" } }));

        var rejected = results.Count(root =>
            ErrorCodes(root).Intersect([DomainErrors.ForbiddenCode, DomainErrors.LastAdminCode]).Any());
        await Assert.That(rejected).IsEqualTo(1);
        await Assert.That(await CountAdministratorsAsync(factory)).IsEqualTo(1);
    }

    [Test]
    public async Task ConcurrentDeletionsOfTwoAdministratorsLeaveOneAdministrator()
    {
        Skip.Unless(PostgresWebApplicationFactory.IsConfigured,
            $"Set {PostgresWebApplicationFactory.ConnectionVariable} to run the PostgreSQL tests.");
        await using var factory = new PostgresWebApplicationFactory();

        await DemoteSeededAdministratorsAsync(factory);
        var ada = await CreateAdminAsync(factory, "ada@example.com");
        var bo = await CreateAdminAsync(factory, "bo@example.com");
        var adaId = await GlobalIdAsync(ada, "ada@example.com");
        var boId = await GlobalIdAsync(ada, "bo@example.com");
        const string deleteUser = "mutation($id: ID!) { deleteUser(id: $id) }";

        var results = await Task.WhenAll(
            PostAsync(ada, deleteUser, new { id = boId }),
            PostAsync(bo, deleteUser, new { id = adaId }));

        var succeeded = results.Count(root => !root.TryGetProperty("errors", out _));
        await Assert.That(succeeded).IsEqualTo(1);
        await Assert.That(await CountAdministratorsAsync(factory)).IsEqualTo(1);
    }

    [Test]
    public async Task UpdateUserSavesNameLanguageAndRoleWithTheRetryingExecutionStrategy()
    {
        Skip.Unless(PostgresWebApplicationFactory.IsConfigured,
            $"Set {PostgresWebApplicationFactory.ConnectionVariable} to run the PostgreSQL tests.");
        await using var factory = new PostgresWebApplicationFactory();

        await DemoteSeededAdministratorsAsync(factory);
        var admin = await CreateAdminAsync(factory, "ada@example.com");
        await SeedLinkedDataAsync(factory, "luca@example.com");
        var id = await GlobalIdAsync(admin, "luca@example.com");

        var root = await PostAsync(admin, UpdateUser, new { id, input = new { firstName = "Lucas", language = "EN" } });
        var promoted = await PostAsync(admin, UpdateUser, new { id, input = new { role = "ADMIN" } });

        await Assert.That(root.TryGetProperty("errors", out _)).IsFalse();
        await Assert.That(promoted.TryGetProperty("errors", out _)).IsFalse();
        await Assert.That(promoted.GetProperty("data").GetProperty("updateUser").GetProperty("role").GetString())
            .IsEqualTo("ADMIN");
    }

    [Test]
    public async Task DeleteUserRemovesLinkedDataThroughRealForeignKeys()
    {
        Skip.Unless(PostgresWebApplicationFactory.IsConfigured,
            $"Set {PostgresWebApplicationFactory.ConnectionVariable} to run the PostgreSQL tests.");
        await using var factory = new PostgresWebApplicationFactory();

        await DemoteSeededAdministratorsAsync(factory);
        var admin = await CreateAdminAsync(factory, "ada@example.com");
        var baselineJoinRows = await CountJoinRowsAsync(factory);
        var victimId = await SeedLinkedDataAsync(factory, "luca@example.com");
        var survivorId = await SeedLinkedDataAsync(factory, "mia@example.com");
        var joinRowsBefore = await CountJoinRowsAsync(factory);

        var root = await PostAsync(admin, "mutation($id: ID!) { deleteUser(id: $id) }",
            new { id = await GlobalIdAsync(admin, "luca@example.com") });

        await Assert.That(root.TryGetProperty("errors", out _)).IsFalse();
        await Assert.That(await CountOwnedRowsAsync(factory, victimId)).IsEqualTo(0);
        await Assert.That(await CountOwnedRowsAsync(factory, survivorId)).IsGreaterThan(0);
        var addedByUsers = joinRowsBefore - baselineJoinRows;
        await Assert.That(addedByUsers).IsGreaterThan(0);
        await Assert.That(await CountJoinRowsAsync(factory)).IsEqualTo(baselineJoinRows + addedByUsers / 2);
    }

    private static async Task<int> SeedLinkedDataAsync(PostgresWebApplicationFactory factory, string username)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AthlifyDbContext>();
        var user = new User { Username = username, FirstName = "Test", LastName = username };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var tag = new Tag { UserId = user.Id, Name = "Tour", NormalizedName = "TOUR" };
        var vehicle = new Vehicle { UserId = user.Id, Brand = "Canyon", Model = "Endurace", Tags = { tag } };
        var gadget = new Gadget { UserId = user.Id, Brand = "Garmin", Model = "Edge", Vehicles = { vehicle }, Tags = { tag } };
        var merge = new ActivityMerge { UserId = user.Id, Name = "Double" };
        db.AddRange(
            tag, vehicle, gadget, merge,
            new Activity
            {
                UserId = user.Id, Date = DateTime.UtcNow, Type = ActivityType.Road, Time = 3600, Distance = 30,
                Vehicle = vehicle, Merge = merge, Tags = { tag }, Gadgets = { gadget },
            },
            new Event
            {
                UserId = user.Id, Name = "Crash", Type = EventType.Crash,
                StartDate = DateOnly.FromDateTime(DateTime.UtcNow), Tags = { tag },
            },
            new MaintenanceCycle { UserId = user.Id, Vehicle = vehicle },
            new BodyStats { UserId = user.Id, Date = DateTime.UtcNow, Weight = 70 },
            new SeedMarker { UserId = user.Id, Key = "demo" },
            new RefreshToken
            {
                UserId = user.Id, TokenHash = Guid.NewGuid().ToString("N"), FamilyId = Guid.NewGuid(),
                Created = DateTime.UtcNow, CreatedByIp = "127.0.0.1", ExpiresAt = DateTime.UtcNow.AddDays(7),
            });
        await db.SaveChangesAsync();
        return user.Id;
    }

    private static async Task<int> CountOwnedRowsAsync(PostgresWebApplicationFactory factory, int userId)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AthlifyDbContext>();
        return await db.Users.IgnoreQueryFilters().CountAsync(u => u.Id == userId)
            + await db.Activities.IgnoreQueryFilters().CountAsync(e => e.UserId == userId)
            + await db.ActivityMerges.IgnoreQueryFilters().CountAsync(e => e.UserId == userId)
            + await db.Vehicles.IgnoreQueryFilters().CountAsync(e => e.UserId == userId)
            + await db.Gadgets.IgnoreQueryFilters().CountAsync(e => e.UserId == userId)
            + await db.MaintenanceCycles.IgnoreQueryFilters().CountAsync(e => e.UserId == userId)
            + await db.Tags.IgnoreQueryFilters().CountAsync(e => e.UserId == userId)
            + await db.Events.IgnoreQueryFilters().CountAsync(e => e.UserId == userId)
            + await db.BodyStats.IgnoreQueryFilters().CountAsync(e => e.UserId == userId)
            + await db.SeedMarkers.IgnoreQueryFilters().CountAsync(e => e.UserId == userId)
            + await db.RefreshTokens.IgnoreQueryFilters().CountAsync(e => e.UserId == userId);
    }

    private static async Task<long> CountJoinRowsAsync(PostgresWebApplicationFactory factory)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AthlifyDbContext>();
        return await db.Database.SqlQuery<long>($"""
            SELECT (SELECT COUNT(*) FROM "ActivityTags") + (SELECT COUNT(*) FROM "ActivityGadgets")
                 + (SELECT COUNT(*) FROM "VehicleTags") + (SELECT COUNT(*) FROM "VehicleGadgets")
                 + (SELECT COUNT(*) FROM "GadgetTags") + (SELECT COUNT(*) FROM "EventTags") AS "Value"
            """).SingleAsync();
    }

    private static async Task DemoteSeededAdministratorsAsync(PostgresWebApplicationFactory factory)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AthlifyDbContext>();
        await db.Database.EnsureCreatedAsync();
        await AdminUsers.All(db)
            .Where(u => u.Role == UserRole.Admin)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.Role, UserRole.User));
    }

    private static async Task<HttpClient> CreateAdminAsync(PostgresWebApplicationFactory factory, string username)
    {
        int userId;
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AthlifyDbContext>();
            var user = new User { Username = username, FirstName = "Test", LastName = username, Role = UserRole.Admin };
            db.Users.Add(user);
            await db.SaveChangesAsync();
            userId = user.Id;
        }

        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add(TestCurrentUser.Header, userId.ToString());
        return client;
    }

    private static async Task<int> CountAdministratorsAsync(PostgresWebApplicationFactory factory)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AthlifyDbContext>();
        return await AdminUsers.All(db)
            .CountAsync(u => u.Role == UserRole.Admin);
    }
}
