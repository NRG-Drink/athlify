using Athlify.Api.Database;
using Athlify.Api.Domain.Common;
using Athlify.Api.Domain.Users;

namespace Athlify.Api.Tests;

public class UserDataDeletionCoverageTests
{
    [Test]
    public async Task EveryOwnedEntityIsRemovedWithItsUser()
    {
        var modelOwned = typeof(IOwned).Assembly.GetTypes()
            .Where(t => !t.IsAbstract && typeof(IOwned).IsAssignableFrom(t) && typeof(Entity).IsAssignableFrom(t))
            .ToHashSet();
        var listed = UserDataDeletion.OwnedEntityTypes.ToHashSet();

        await Assert.That(listed).IsEquivalentTo(modelOwned);
    }
}
