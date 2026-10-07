using GreenDonut.Data;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Common;

/// <summary>Loads one record shaped by the GraphQL selection, like the list fields do.</summary>
public static class Projection
{
    /// <summary>
    /// Mutations and <c>node(id:)</c> return their record through this method, so nested selections
    /// (for example an activity's bicycle with its tags) are loaded exactly as in the lists.
    /// </summary>
    public static async Task<T?> FirstOrDefaultAsync<T>(
        IQueryable<T> source,
        int id,
        QueryContext<T> query,
        CancellationToken cancellationToken)
        where T : Entity
    {
        return await source
            .Where(e => e.Id == id)
            .With(query, sort => sort)
            .FirstOrDefaultAsync(cancellationToken);
    }
}
