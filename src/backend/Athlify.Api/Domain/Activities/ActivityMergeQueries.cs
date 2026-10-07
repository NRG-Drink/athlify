using Athlify.Api.Database;
using GreenDonut.Data;
using HotChocolate.Types.Pagination;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Activities;

[QueryType]
public static partial class ActivityMergeQuery
{
    private static readonly Func<SortDefinition<ActivityMerge>, SortDefinition<ActivityMerge>> DefaultOrder =
        sort => sort.AddDescending(m => m.CreatedAt).AddDescending(m => m.Id);

    [UseFiltering]
    [UseSorting]
    public static async Task<PageConnection<ActivityMerge>> GetActivityMerges(
        PagingArguments pagingArgs,
        QueryContext<ActivityMerge> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        var page = await db.ActivityMerges
            .With(query.Include(m => m.Id), DefaultOrder)
            .ToPageAsync(pagingArgs, cancellationToken);
        return new PageConnection<ActivityMerge>(page);
    }
}
