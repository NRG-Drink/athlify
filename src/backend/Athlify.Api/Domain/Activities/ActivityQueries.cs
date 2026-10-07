using Athlify.Api.Database;
using GreenDonut.Data;
using HotChocolate.Types.Pagination;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Activities;

[QueryType]
public static partial class ActivityQuery
{
    private static readonly Func<SortDefinition<Activity>, SortDefinition<Activity>> DefaultOrder =
        sort => sort.AddDescending(a => a.Date).AddDescending(a => a.Id);

    /// <summary>Active activities, newest first; soft-deleted ones are never returned.</summary>
    [UseFiltering]
    [UseSorting]
    public static async Task<PageConnection<Activity>> GetActivities(
        PagingArguments pagingArgs,
        QueryContext<Activity> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        var page = await db.Activities
            .With(query.Include(a => a.Id), DefaultOrder)
            .ToPageAsync(pagingArgs, cancellationToken);
        return new PageConnection<Activity>(page);
    }
}
