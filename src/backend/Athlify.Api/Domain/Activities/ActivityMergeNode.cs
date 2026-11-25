using Athlify.Api.Database;
using Athlify.Api.Domain.Common;
using GreenDonut.Data;
using HotChocolate.Types.Relay;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Activities;

public sealed class ActivityMergeNode
{
    public Task<ActivityMerge?> GetAsync(
        [ID<ActivityMerge>] int id,
        QueryContext<ActivityMerge> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken) =>
        Projection.FirstOrDefaultAsync(db.ActivityMerges, id, query, cancellationToken);
}
