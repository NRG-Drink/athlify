using Athlify.Api.Database;
using GreenDonut.Data;
using HotChocolate.Types.Pagination;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Activities;

[QueryType]
public sealed partial class ActivityQuery
{
    private static readonly Func<SortDefinition<Activity>, SortDefinition<Activity>> DefaultOrder =
        sort => sort.AddDescending(a => a.Date).AddDescending(a => a.Id);

    [UseFiltering]
    [UseSorting]
    public async Task<PageConnection<Activity>> GetActivities(
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
