using Athlify.Api.Database;
using Athlify.Api.Domain.Common;
using GreenDonut.Data;
using HotChocolate.Types.Relay;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Activities;

public sealed class ActivityNode
{
    public Task<Activity?> GetAsync(
        [ID<Activity>] int id,
        QueryContext<Activity> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken) =>
        Projection.FirstOrDefaultAsync(db.Activities, id, query, cancellationToken);
}
